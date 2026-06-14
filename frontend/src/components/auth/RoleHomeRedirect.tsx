import { Navigate } from 'react-router-dom';
import { getRoleHomePath } from '../../lib/routes';
import { useAuth } from '../../providers/AuthProvider';

export function RoleHomeRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleHomePath(user.role)} replace />;
}
