import { Role } from '@prisma/client';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { SafeUser } from '../users/types/safe-user.type';

export const userRecord = {
  id: 1,
  organizationId: DEFAULT_ORGANIZATION_ID,
  name: 'Test User',
  email: 'user@example.com',
  phone: '+910000000000',
  passwordHash: 'hashed-password',
  role: Role.USER,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

export const adminUser: SafeUser = {
  id: 2,
  organizationId: DEFAULT_ORGANIZATION_ID,
  name: 'Admin User',
  email: 'admin@example.com',
  phone: '+910000000001',
  role: Role.ADMIN,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

export const normalUser: SafeUser = {
  id: userRecord.id,
  organizationId: userRecord.organizationId,
  name: userRecord.name,
  email: userRecord.email,
  phone: userRecord.phone,
  role: userRecord.role,
  isActive: userRecord.isActive,
  createdAt: userRecord.createdAt,
  updatedAt: userRecord.updatedAt,
};
