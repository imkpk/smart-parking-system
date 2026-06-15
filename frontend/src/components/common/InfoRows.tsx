import { Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

export interface InfoRow {
  label: string;
  value: ReactNode;
}

export function InfoRows({ rows }: { rows: InfoRow[] }) {
  return (
    <Stack spacing={2}>
      {rows.map((row) => (
        <Stack key={row.label} direction="row" justifyContent="space-between" spacing={2}>
          <Typography color="text.secondary">{row.label}</Typography>
          <Typography component="div" fontWeight={700} textAlign="right">
            {row.value}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
