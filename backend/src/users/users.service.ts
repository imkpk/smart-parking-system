import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

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
