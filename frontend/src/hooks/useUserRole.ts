import { useAuth } from '../providers/AuthProvider';

export function useUserRole() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isSecurity = user?.role === 'SECURITY';
  const isUser = user?.role === 'USER';

  return {
    user,
    isAdmin,
    isSecurity,
    isUser,
    canOperateParkingEvents: isAdmin || isSecurity,
    canViewOperationalPayments: isAdmin || isSecurity,
  };
}
