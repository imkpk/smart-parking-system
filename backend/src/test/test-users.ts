import { Role } from '@prisma/client';
import {
  DEFAULT_ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
} from '../organizations/organizations.constants';
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

export const adminUserRecord = {
  ...adminUser,
  passwordHash: 'hashed-admin-password',
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

export const securityUser: SafeUser = {
  id: 3,
  organizationId: DEFAULT_ORGANIZATION_ID,
  name: 'Security User',
  email: 'security@example.com',
  phone: '+910000000002',
  role: Role.SECURITY,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

export const adminUserOrg2: SafeUser = {
  id: 12,
  organizationId: OTHER_ORGANIZATION_ID,
  name: 'Org2 Admin',
  email: 'admin-org2@example.com',
  phone: '+910000000012',
  role: Role.ADMIN,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

export const normalUserOrg2: SafeUser = {
  id: 11,
  organizationId: OTHER_ORGANIZATION_ID,
  name: 'Org2 User',
  email: 'user-org2@example.com',
  phone: '+910000000011',
  role: Role.USER,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

export const securityUserOrg2: SafeUser = {
  id: 13,
  organizationId: OTHER_ORGANIZATION_ID,
  name: 'Org2 Security',
  email: 'security-org2@example.com',
  phone: '+910000000013',
  role: Role.SECURITY,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};
export const superAdminUser: SafeUser = {
  id: 99,
  organizationId: null,
  name: 'Platform Super Admin',
  email: 'super-admin@example.com',
  phone: '+910000000099',
  role: Role.SUPER_ADMIN,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};
