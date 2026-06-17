import { Box, Paper, Stack, Typography } from '@mui/material';
import type { IllustrationName } from '../../assets/illustrations';
import { Illustration } from '../../components/common/Illustration';

export function PlaceholderPage({
  title,
  description,
  illustration = 'dashboard',
}: {
  title: string;
  description: string;
  illustration?: IllustrationName;
}) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {description}
        </Typography>
      </Box>
      <Paper
        elevation={0}
        sx={{
          alignItems: 'center',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: 4,
          textAlign: 'center',
        }}
      >
        <Illustration maxWidth={280} name={illustration} />
        <Typography color="text.secondary" maxWidth={480}>
          This screen is ready for API-backed content in the next frontend milestone.
        </Typography>
      </Paper>
    </Stack>
  );
}