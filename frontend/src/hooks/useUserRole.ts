import { useAuth } from '../providers/AuthProvider';

export function useUserRole() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isTenantAdmin = user?.role === 'TENANT_ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const isSecurity = user?.role === 'SECURITY';
  const isUser = user?.role === 'USER';
  const isOperationalAdmin = isAdmin || isTenantAdmin;

  return {
    user,
    isSuperAdmin,
    isTenantAdmin,
    isAdmin,
    isSecurity,
    isUser,
    isOperationalAdmin,
    canOperateParkingEvents: isOperationalAdmin || isSecurity,
    canViewOperationalPayments: isOperationalAdmin || isSecurity,
  };
}