import { Role } from '../types/auth';

const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  TENANT_ADMIN: 'Tenant Admin',
  ADMIN: 'Admin',
  SECURITY: 'Security',
  USER: 'User',
};

export function formatRole(role: Role | string | undefined) {
  if (!role) {
    return '';
  }

  return roleLabels[role as Role] ?? role;
}