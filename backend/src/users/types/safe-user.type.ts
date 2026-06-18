import { Role } from '@prisma/client';
import { OrganizationSummary } from './organization-summary.type';

export type SafeUser = {
  id: number;
  organizationId: number | null;
  organization?: OrganizationSummary | null;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
