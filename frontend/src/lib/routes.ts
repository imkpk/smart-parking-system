import { Role } from '../types/auth';

export function getRoleHomePath(role: Role) {
  if (role === 'SUPER_ADMIN') {
    return '/platform/admin';
  }

  if (role === 'TENANT_ADMIN' || role === 'ADMIN') {
    return '/admin/dashboard';
  }

  if (role === 'SECURITY') {
    return '/security/dashboard';
  }

  return '/user/dashboard';
}