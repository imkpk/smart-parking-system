import { Box, Paper, Stack, Typography } from '@mui/material';

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
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
          border: '1px solid',
          borderColor: 'divider',
          p: 3,
        }}
      >
        <Typography color="text.secondary">
          This screen is ready for API-backed content in the next frontend milestone.
        </Typography>
      </Paper>
    </Stack>
  );
}
