import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { handlePrismaUniqueConstraint } from '../prisma/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from './types/safe-user.type';

const USER_UNIQUE_MESSAGES = {
  email: 'Email already exists',
  phone: 'Phone number already exists',
  'organizationId,email': 'Email already exists',
  'organizationId,phone': 'Phone number already exists',
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<SafeUser> {
    try {
      const user = await this.prisma.user.create({ data });
      return this.toSafeUser(user);
    } catch (error) {
      handlePrismaUniqueConstraint(error, USER_UNIQUE_MESSAGES, 'User already exists');
    }
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
    });
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        phone,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
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
      organizationId: user.organizationId,
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
