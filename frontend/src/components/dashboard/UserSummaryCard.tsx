import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getUserSummary } from '../../api/usersApi';

export function UserSummaryCard() {
  const summaryQuery = useQuery({
    queryKey: ['users', 'summary'],
    queryFn: getUserSummary,
  });

  const summary = summaryQuery.data;

  if (summaryQuery.isLoading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography color="text.secondary">Loading organization users...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (summaryQuery.isError || !summary) {
    return null;
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="h6">Organization users</Typography>
          <Typography color="text.secondary" variant="body2">
            Total {summary.totalUsers} · Active {summary.activeUsers} · Inactive{' '}
            {summary.inactiveUsers}
          </Typography>
          <Typography variant="body2">
            Tenant admins {summary.tenantAdmins} · Admins {summary.admins} · Security{' '}
            {summary.security} · Users {summary.users}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}