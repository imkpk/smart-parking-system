import { Role } from '@prisma/client';

export type SafeUser = {
  id: number;
  organizationId: number | null;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
