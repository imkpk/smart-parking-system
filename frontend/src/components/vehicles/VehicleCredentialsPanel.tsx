import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { QrCode2 } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  assignRfidCredential,
  generateQrCredential,
  getVehicleCredentials,
  revokeVehicleCredential,
} from '../../api/vehicleCredentialsApi';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { StatusChip } from '../common/StatusChip';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { getApiErrorMessage } from '../../lib/apiError';
import { formatDateTime, formatStatusLabel } from '../../lib/formatters';
import { VehicleCredential } from '../../types/iot';

export function VehicleCredentialsPanel({ vehicleId }: { vehicleId: number }) {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useAppSnackbar();
  const [rfidDialogOpen, setRfidDialogOpen] = useState(false);
  const [rfidTag, setRfidTag] = useState('');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<VehicleCredential | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const credentialsQuery = useQuery({
    queryKey: ['vehicles', vehicleId, 'credentials'],
    queryFn: () => getVehicleCredentials(vehicleId),
    enabled: Number.isFinite(vehicleId),
  });

  const invalidateCredentials = () =>
    queryClient.invalidateQueries({ queryKey: ['vehicles', vehicleId, 'credentials'] });

  const assignRfidMutation = useMutation({
    mutationFn: (tag: string) => assignRfidCredential(vehicleId, { rfidTag: tag }),
    onSuccess: async () => {
      await invalidateCredentials();
      setRfidDialogOpen(false);
      setRfidTag('');
      showSuccess('RFID credential assigned.');
    },
    onError: (error) => showError(getApiErrorMessage(error)),
  });

  const generateQrMutation = useMutation({
    mutationFn: () => generateQrCredential(vehicleId),
    onSuccess: (result) => {
      setQrPayload(result.qrPayload);
      setQrDialogOpen(true);
      void invalidateCredentials();
    },
    onError: (error) => showError(getApiErrorMessage(error)),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeVehicleCredential,
    onSuccess: async () => {
      await invalidateCredentials();
      setRevokeTarget(null);
      showSuccess('Credential revoked.');
    },
    onError: (error) => showError(getApiErrorMessage(error)),
  });

  useEffect(() => {
    if (!qrPayload || !qrCanvasRef.current) {
      return;
    }

    void QRCode.toCanvas(qrCanvasRef.current, qrPayload, {
      margin: 2,
      width: 220,
    }).then(() =>
      QRCode.toDataURL(qrPayload, { margin: 2, width: 220 }).then(setQrDataUrl),
    );
  }, [qrPayload]);

  const closeQrDialog = () => {
    setQrDialogOpen(false);
    setQrPayload(null);
    setQrDataUrl(null);
  };

  const handleAssignRfid = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTag = rfidTag.trim();

    if (!normalizedTag) {
      showError('Enter an RFID tag value.');
      return;
    }

    assignRfidMutation.mutate(normalizedTag);
  };

  const credentials = credentialsQuery.data ?? [];
  const activeCredentials = credentials.filter((credential) => credential.status === 'ACTIVE');

  return (
    <Stack spacing={2}>
      <Stack alignItems={{ xs: 'stretch', sm: 'center' }} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button onClick={() => setRfidDialogOpen(true)} variant="outlined">
          Assign RFID
        </Button>
        <Button
          disabled={generateQrMutation.isPending || activeCredentials.some((c) => c.credentialType === 'QR_CODE')}
          onClick={() => generateQrMutation.mutate()}
          startIcon={
            generateQrMutation.isPending ? <CircularProgress color="inherit" size={18} /> : <QrCode2 />
          }
          variant="contained"
        >
          Generate QR
        </Button>
      </Stack>

      {credentialsQuery.isLoading ? <CircularProgress size={24} /> : null}
      {credentialsQuery.error ? (
        <Alert severity="error">
          {getApiErrorMessage(credentialsQuery.error, 'Could not load credentials.')}
        </Alert>
      ) : null}

      {credentials.length === 0 && !credentialsQuery.isLoading ? (
        <Alert severity="info">
          No access credentials yet. Assign an RFID tag or generate a one-time QR code for gate entry.
        </Alert>
      ) : null}

      {credentials.map((credential) => (
        <Box
          key={credential.id}
          sx={{
            alignItems: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            justifyContent: 'space-between',
            px: 1.5,
            py: 1,
          }}
        >
          <Stack spacing={0.25}>
            <Typography fontWeight={600} variant="body2">
              {formatStatusLabel(credential.credentialType)} · ****{credential.displaySuffix}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              Valid from {formatDateTime(credential.validFrom)}
              {credential.validUntil ? ` · until ${formatDateTime(credential.validUntil)}` : ''}
            </Typography>
          </Stack>
          <Stack alignItems="center" direction="row" spacing={1}>
            <StatusChip status={credential.status} />
            {credential.status === 'ACTIVE' ? (
              <Button color="error" onClick={() => setRevokeTarget(credential)} size="small">
                Revoke
              </Button>
            ) : null}
          </Stack>
        </Box>
      ))}

      <Dialog fullWidth maxWidth="sm" onClose={() => setRfidDialogOpen(false)} open={rfidDialogOpen}>
        <Box component="form" onSubmit={handleAssignRfid}>
          <DialogTitle>Assign RFID Credential</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                autoFocus
                fullWidth
                helperText="UHF RFID tag value from your reader or sticker."
                label="RFID Tag"
                onChange={(event) => setRfidTag(event.target.value)}
                required
                value={rfidTag}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRfidDialogOpen(false)}>Cancel</Button>
            <Button disabled={assignRfidMutation.isPending} type="submit" variant="contained">
              Assign
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog fullWidth maxWidth="xs" onClose={closeQrDialog} open={qrDialogOpen}>
        <DialogTitle>QR Credential — One-Time Display</DialogTitle>
        <DialogContent>
          <Stack alignItems="center" spacing={2}>
            <Alert severity="warning" sx={{ width: '100%' }}>
              This QR payload is shown only once. Save or print it now — it cannot be retrieved later.
            </Alert>
            <Box
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
              }}
            >
              <canvas aria-label="Vehicle access QR code" ref={qrCanvasRef} />
            </Box>
            {qrDataUrl ? (
              <Typography color="text.secondary" textAlign="center" variant="caption">
                Scan at the gate QR reader for automatic entry.
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeQrDialog} variant="contained">
            I have saved this QR
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        confirmLabel="Revoke"
        description={
          revokeTarget
            ? `Revoke ${formatStatusLabel(revokeTarget.credentialType)} credential ending in ${revokeTarget.displaySuffix}?`
            : ''
        }
        isLoading={revokeMutation.isPending}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (revokeTarget) {
            revokeMutation.mutate(revokeTarget.id);
          }
        }}
        open={Boolean(revokeTarget)}
        title="Revoke Credential"
      />
    </Stack>
  );
}