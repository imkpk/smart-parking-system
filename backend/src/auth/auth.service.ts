import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { isEmailIdentifier, normalizeIndianPhone } from '../common/phone.util';
import { resolveUniqueOrganizationSlug } from '../organizations/organization-slug.util';
import { handlePrismaUniqueConstraint } from '../prisma/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailerService } from '../common/mailer.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './types/jwt-payload.type';

const REGISTER_UNIQUE_MESSAGES = {
  slug: 'Organization slug already exists',
  'organizationId,email': 'Email already exists',
  'organizationId,phone': 'Phone number already exists',
  email: 'Email already exists',
  phone: 'Phone number already exists',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    await this.assertSignupEmailAvailable(registerDto.email);

    if (registerDto.phone) {
      await this.assertSignupPhoneAvailable(registerDto.phone);
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const slug = await resolveUniqueOrganizationSlug(
      registerDto.organizationName,
      async (candidate) => {
        const existing = await this.prisma.organization.findUnique({
          where: { slug: candidate },
          select: { id: true },
        });
        return existing != null;
      },
    );

    try {
      const createdUser = await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: registerDto.organizationName.trim(),
            slug,
            organizationType: registerDto.organizationType,
          },
        });

        return tx.user.create({
          data: {
            organizationId: organization.id,
            name: registerDto.name.trim(),
            email: registerDto.email.toLowerCase(),
            phone: registerDto.phone,
            passwordHash,
            role: Role.TENANT_ADMIN,
            isActive: true,
          },
        });
      });

      const user = await this.usersService.findActiveById(createdUser.id);

      if (!user) {
        throw new UnauthorizedException('User account is inactive');
      }

      return {
        user,
        accessToken: this.signToken(user),
      };
    } catch (error) {
      handlePrismaUniqueConstraint(
        error,
        REGISTER_UNIQUE_MESSAGES,
        'Registration record already exists',
      );
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const email = forgotPasswordDto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
      select: { id: true, email: true },
    });

    if (!user?.email) {
      return {
        message: 'If this email exists, a reset link has been sent.',
      };
    }

    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);
    const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiresAt,
      },
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Reset your Smart Parking password',
      text: `Click the link below to reset your password. This link expires in 1 hour.\n\n${frontendUrl}/reset-password?token=${rawToken}`,
    });

    return {
      message: 'If this email exists, a reset link has been sent.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const candidates = await this.prisma.user.findMany({
      where: {
        passwordResetExpiresAt: { gt: new Date() },
        passwordResetToken: { not: null },
      },
      select: {
        id: true,
        passwordResetToken: true,
      },
    });

    let matchedUserId: number | null = null;

    for (const candidate of candidates) {
      if (!candidate.passwordResetToken) {
        continue;
      }

      const isMatch = await bcrypt.compare(
        resetPasswordDto.token,
        candidate.passwordResetToken,
      );

      if (isMatch) {
        matchedUserId = candidate.id;
        break;
      }
    }

    if (!matchedUserId) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: matchedUserId },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    return {
      message: 'Password reset successful. Please log in.',
    };
  }

  async login(loginDto: LoginDto) {
    const candidates = await this.resolveLoginCandidates(loginDto.email.trim());

    if (candidates.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const matches: User[] = [];

    for (const candidate of candidates) {
      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        candidate.passwordHash,
      );

      if (isPasswordValid) {
        matches.push(candidate);
      }
    }

    if (matches.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (matches.length > 1) {
      throw new ConflictException(
        'Multiple accounts match this login. Contact support to resolve access.',
      );
    }

    const user = await this.usersService.findActiveById(matches[0].id);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      user,
      accessToken: this.signToken(user),
    };
  }

  private async resolveLoginCandidates(identifier: string) {
    const normalizedPhone = normalizeIndianPhone(identifier);

    if (normalizedPhone) {
      return this.usersService.findActiveLoginCandidatesByPhone(normalizedPhone);
    }

    if (isEmailIdentifier(identifier)) {
      return this.usersService.findActiveLoginCandidatesByEmail(identifier);
    }

    return [];
  }

  private async assertSignupEmailAvailable(email: string) {
    const existing = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }
  }

  private async assertSignupPhoneAvailable(phone: string) {
    const existing = await this.prisma.user.findFirst({
      where: { phone },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Phone number already exists');
    }
  }

  private signToken(user: {
    id: number;
    email: string | null;
    phone?: string | null;
    role: JwtPayload['role'];
    organizationId?: number | null;
  }) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email ?? user.phone ?? '',
      role: user.role,
      organizationId: user.organizationId ?? null,
    });
  }
}