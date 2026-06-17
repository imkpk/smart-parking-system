import { Paper, Stack } from '@mui/material';
import type { IllustrationName } from '../../assets/illustrations';
import { Illustration } from '../../components/common/Illustration';
import { PageHeader } from '../../components/common/PageHeader';

export function PlaceholderPage({
  title,
  illustration = 'dashboard',
}: {
  title: string;
  illustration?: IllustrationName;
}) {
  return (
    <Stack spacing={3}>
      <PageHeader title={title} />
      <Paper
        elevation={0}
        sx={{
          alignItems: 'center',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <Illustration maxWidth={240} name={illustration} />
      </Paper>
    </Stack>
  );
}