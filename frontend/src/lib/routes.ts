import { Role } from '../types/auth';

export function getRoleHomePath(role: Role) {
  if (role === 'ADMIN') {
    return '/admin/dashboard';
  }

  if (role === 'SECURITY') {
    return '/security/dashboard';
  }

  return '/user/dashboard';
}
