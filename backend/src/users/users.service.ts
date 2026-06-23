import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AccessPolicyService } from '../common/access-policy.service';
import { normalizeIndianPhone } from '../common/phone.util';
import { handlePrismaUniqueConstraint } from '../prisma/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsageLimitsService } from '../usage-limits/usage-limits.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SafeUser } from './types/safe-user.type';
import { UserSummary } from './types/user-summary.type';

const USER_UNIQUE_MESSAGES = {
  email: 'Email already exists',
  phone: 'Phone number already exists',
  'organizationId,email': 'Email already exists',
  'organizationId,phone': 'Phone number already exists',
};

const TENANT_ADMIN_CREATABLE_ROLES: Role[] = [
  Role.ADMIN,
  Role.SECURITY,
  Role.USER,
];

const ADMIN_CREATABLE_ROLES: Role[] = [Role.SECURITY, Role.USER];

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
    private readonly usageLimitsService: UsageLimitsService,
  ) {}

  async create(data: Prisma.UserCreateInput): Promise<SafeUser> {
    try {
      const user = await this.prisma.user.create({ data });
      return this.toSafeUser(user);
    } catch (error) {
      handlePrismaUniqueConstraint(error, USER_UNIQUE_MESSAGES, 'User already exists');
    }
  }

  async createManagedUser(
    currentUser: SafeUser,
    dto: CreateUserDto,
  ): Promise<SafeUser> {
    this.assertCanCreateRole(currentUser.role, dto.role);
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    await this.usageLimitsService.checkLimit(organizationId, 'users');
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const normalizedPhone = normalizeIndianPhone(dto.phone);
    if (!normalizedPhone) {
      throw new ConflictException('phone must be a valid Indian mobile number (+91XXXXXXXXXX)');
    }

    const normalizedEmail = dto.email?.trim().toLowerCase();

    try {
      const user = await this.prisma.user.create({
        data: {
          organizationId,
          name: dto.name.trim(),
          email: normalizedEmail || null,
          phone: normalizedPhone,
          passwordHash,
          role: dto.role,
          isActive: dto.isActive ?? true,
        },
      });

      return this.toSafeUser(user);
    } catch (error) {
      handlePrismaUniqueConstraint(error, USER_UNIQUE_MESSAGES, 'User already exists');
    }
  }

  async getSummary(currentUser: SafeUser): Promise<UserSummary> {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      select: { role: true, isActive: true },
    });

    const summary: UserSummary = {
      totalUsers: users.length,
      activeUsers: 0,
      inactiveUsers: 0,
      tenantAdmins: 0,
      admins: 0,
      security: 0,
      users: 0,
    };

    for (const user of users) {
      if (user.isActive) {
        summary.activeUsers += 1;
      } else {
        summary.inactiveUsers += 1;
      }

      switch (user.role) {
        case Role.TENANT_ADMIN:
          summary.tenantAdmins += 1;
          break;
        case Role.ADMIN:
          summary.admins += 1;
          break;
        case Role.SECURITY:
          summary.security += 1;
          break;
        case Role.USER:
          summary.users += 1;
          break;
        default:
          break;
      }
    }

    return summary;
  }

  findActiveLoginCandidatesByEmail(email: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
    });
  }

  findActiveLoginCandidatesByPhone(phone: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        phone,
        isActive: true,
      },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
    });
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        phone,
        isActive: true,
      },
    });
  }

  async findAll(currentUser: SafeUser): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({
      where: this.accessPolicy.buildOrganizationWhere(currentUser),
      orderBy: { id: 'asc' },
    });

    return users.map((user) => this.toSafeUser(user));
  }

  async findOne(id: number, currentUser: SafeUser): Promise<SafeUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        ...this.accessPolicy.buildOrganizationWhere(currentUser),
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toSafeUser(user);
  }

  async findActiveById(id: number): Promise<SafeUser | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        isActive: true,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return user ? this.toSafeUser(user, user.organization) : null;
  }

  assertCanCreateRole(actorRole: Role, targetRole: Role) {
    if (targetRole === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot create SUPER_ADMIN users');
    }

    if (targetRole === Role.TENANT_ADMIN && actorRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot create TENANT_ADMIN users');
    }

    if (actorRole === Role.TENANT_ADMIN) {
      if (!TENANT_ADMIN_CREATABLE_ROLES.includes(targetRole)) {
        throw new ForbiddenException('Role is not allowed for tenant admin creation');
      }
      return;
    }

    if (actorRole === Role.ADMIN) {
      if (!ADMIN_CREATABLE_ROLES.includes(targetRole)) {
        throw new ForbiddenException('Role is not allowed for admin creation');
      }
      return;
    }

    throw new ForbiddenException('You do not have permission to create users');
  }

  toSafeUser(
    user: User,
    organization?: { id: number; name: string; slug: string } | null,
  ): SafeUser {
    return {
      id: user.id,
      organizationId: user.organizationId,
      organization: organization ?? null,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}