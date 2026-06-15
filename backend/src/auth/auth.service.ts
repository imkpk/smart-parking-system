import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    if (registerDto.phone) {
      const existingPhone = await this.usersService.findByPhone(
        registerDto.phone,
      );

      if (existingPhone) {
        throw new ConflictException('Phone number already exists');
      }
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      phone: registerDto.phone,
      passwordHash,
      role: registerDto.role,
    });

    return {
      user,
      accessToken: this.signToken(user),
    };
  }

  async login(loginDto: LoginDto) {
    const userWithPassword = await this.usersService.findByEmail(
      loginDto.email,
    );

    if (!userWithPassword || !userWithPassword.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      userWithPassword.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = this.usersService.toSafeUser(userWithPassword);

    return {
      user,
      accessToken: this.signToken(user),
    };
  }

  private signToken(user: { id: number; email: string; role: JwtPayload['role'] }) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}
