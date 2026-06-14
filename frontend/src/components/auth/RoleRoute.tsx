import { Alert, Box, Button, Typography } from '@mui/material';
import { Link as RouterLink, Outlet } from 'react-router-dom';
import { getRoleHomePath } from '../../lib/routes';
import { useAuth } from '../../providers/AuthProvider';
import { Role } from '../../types/auth';

export function RoleRoute({ allowedRoles }: { allowedRoles: Role[] }) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          You do not have access to this page.
        </Alert>
        {user ? (
          <Button component={RouterLink} to={getRoleHomePath(user.role)} variant="contained">
            Go to dashboard
          </Button>
        ) : (
          <Typography>Please login again.</Typography>
        )}
      </Box>
    );
  }

  return <Outlet />;
}
