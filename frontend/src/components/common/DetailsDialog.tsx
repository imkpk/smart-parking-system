import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { ReactNode } from 'react';

export interface DetailsRow {
  label: string;
  value: ReactNode;
}

function DetailRow({ label, value }: DetailsRow) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography component="div" fontWeight={700} textAlign="right">
        {value}
      </Typography>
    </Stack>
  );
}

export function DetailsDialog({
  onClose,
  open,
  summaryRows,
  technicalRows,
  title,
}: {
  onClose: () => void;
  open: boolean;
  summaryRows: DetailsRow[];
  technicalRows?: DetailsRow[];
  title: string;
}) {
  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {summaryRows.map((row) => (
            <DetailRow key={row.label} {...row} />
          ))}

          {technicalRows?.length ? (
            <>
              <Divider />
              <Typography fontWeight={700}>Technical Details</Typography>
              <Stack spacing={1}>
                {technicalRows.map((row) => (
                  <DetailRow key={row.label} {...row} />
                ))}
              </Stack>
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
