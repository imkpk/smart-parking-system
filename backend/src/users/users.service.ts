import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from './types/safe-user.type';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<SafeUser> {
    try {
      const user = await this.prisma.user.create({ data });
      return this.toSafeUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const fields = Array.isArray(error.meta?.target)
          ? error.meta.target
          : [];

        if (fields.includes('email')) {
          throw new ConflictException('Email already exists');
        }

        if (fields.includes('phone')) {
          throw new ConflictException('Phone number already exists');
        }

        throw new ConflictException('User already exists');
      }

      throw error;
    }
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { id: 'asc' },
    });

    return users.map((user) => this.toSafeUser(user));
  }

  async findOne(id: number): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
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
    });

    return user ? this.toSafeUser(user) : null;
  }

  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
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
