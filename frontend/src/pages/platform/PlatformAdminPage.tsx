import { Card, CardContent, Stack, Typography } from '@mui/material';
import { PageHeader } from '../../components/common/PageHeader';

export function PlatformAdminPage() {
  return (
    <Stack spacing={2}>
      <PageHeader
        compact
        description="Platform-wide tenant management and operations"
        title="Platform Admin"
      />
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Tenant management coming soon</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            SUPER_ADMIN platform tools will live here. Tenant-scoped dashboards are not shown on
            this screen.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}