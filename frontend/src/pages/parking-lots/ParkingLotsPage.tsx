import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  useMediaQuery,
  useTheme,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add, Delete, Edit, Search, Visibility } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  createParkingLot,
  deleteParkingLot,
  getParkingLots,
  updateParkingLot,
} from '../../api/parkingLotsApi';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';
import {
  ParkingLot,
  ParkingLotPayload,
  ParkingLotType,
  parkingLotTypeOptions,
} from '../../types/parkingLot';

const emptyForm: ParkingLotPayload = {
  name: '',
  type: 'APARTMENT',
  address: '',
  city: '',
  state: '',
  pincode: '',
  isActive: true,
};

export function ParkingLotsPage() {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isCompactAction = useMediaQuery(theme.breakpoints.down('md'));
  const [formOpen, setFormOpen] = useState(false);
  const [editingParkingLot, setEditingParkingLot] = useState<ParkingLot | null>(null);
  const [form, setForm] = useState<ParkingLotPayload>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ParkingLot | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  const parkingLotsQuery = useQuery({
    queryKey: ['parking-lots'],
    queryFn: getParkingLots,
  });

  const invalidateParkingLots = () =>
    queryClient.invalidateQueries({ queryKey: ['parking-lots'] });

  const createMutation = useMutation({
    mutationFn: createParkingLot,
    onSuccess: async () => {
      await invalidateParkingLots();
      setSnackbar({ message: 'Parking lot created.', severity: 'success' });
      closeForm();
    },
    onError: (error) => {
      setSnackbar({
        message: getApiErrorMessage(error, 'Could not create parking lot.'),
        severity: 'error',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ParkingLotPayload }) =>
      updateParkingLot(id, payload),
    onSuccess: async () => {
      await invalidateParkingLots();
      setSnackbar({ message: 'Parking lot updated.', severity: 'success' });
      closeForm();
    },
    onError: (error) => {
      setSnackbar({
        message: getApiErrorMessage(error, 'Could not update parking lot.'),
        severity: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteParkingLot,
    onSuccess: async () => {
      await invalidateParkingLots();
      setSnackbar({ message: 'Parking lot deleted.', severity: 'success' });
      setDeleteTarget(null);
    },
    onError: (error) => {
      setSnackbar({
        message: getApiErrorMessage(error, 'Could not delete parking lot.'),
        severity: 'error',
      });
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const sortedParkingLots = useMemo(
    () => parkingLotsQuery.data ?? [],
    [parkingLotsQuery.data],
  );
  const filteredParkingLots = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return sortedParkingLots;
    }

    return sortedParkingLots.filter((parkingLot) =>
      [
        parkingLot.name,
        parkingLot.type,
        parkingLot.address,
        parkingLot.city,
        parkingLot.state,
        parkingLot.pincode,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [search, sortedParkingLots]);
  const visibleParkingLots = useMemo(
    () =>
      filteredParkingLots.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
      ),
    [filteredParkingLots, page, rowsPerPage],
  );

  const openCreateForm = () => {
    setEditingParkingLot(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (parkingLot: ParkingLot) => {
    setEditingParkingLot(parkingLot);
    setForm({
      name: parkingLot.name,
      type: parkingLot.type,
      address: parkingLot.address ?? '',
      city: parkingLot.city ?? '',
      state: parkingLot.state ?? '',
      pincode: parkingLot.pincode ?? '',
      isActive: parkingLot.isActive,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) {
      return;
    }

    setFormOpen(false);
    setEditingParkingLot(null);
    setForm(emptyForm);
  };

  const updateField = <Key extends keyof ParkingLotPayload>(
    key: Key,
    value: ParkingLotPayload[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toPayload = () => ({
    ...form,
    address: form.address?.trim() || undefined,
    city: form.city?.trim() || undefined,
    state: form.state?.trim() || undefined,
    pincode: form.pincode?.trim() || undefined,
    name: form.name.trim(),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = toPayload();

    if (editingParkingLot) {
      updateMutation.mutate({ id: editingParkingLot.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const handlePageChange = (_event: unknown, nextPage: number) => {
    setPage(nextPage);
  };

  const handleRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(0);
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        action={
          <Tooltip title="Create Parking Lot">
            <Button
              aria-label="Create Parking Lot"
              onClick={openCreateForm}
              startIcon={isCompactAction ? undefined : <Add />}
              variant="contained"
              sx={{
                height: { xs: 44, md: 40 },
                minWidth: { xs: 44, md: 180 },
                px: { xs: 0, md: 2 },
              }}
            >
              {isCompactAction ? <Add /> : 'Create Parking Lot'}
            </Button>
          </Tooltip>
        }
        title="Parking Lots"
        description="Create, update, and deactivate parking lots."
      />

      {parkingLotsQuery.isLoading ? (
        <Stack alignItems="center" py={8}>
          <CircularProgress />
        </Stack>
      ) : null}

      {parkingLotsQuery.error ? (
        <Alert severity={isForbiddenError(parkingLotsQuery.error) ? 'warning' : 'error'}>
          {isForbiddenError(parkingLotsQuery.error)
            ? 'Access denied. Admin role is required to manage parking lots.'
            : getApiErrorMessage(parkingLotsQuery.error, 'Could not load parking lots.')}
        </Alert>
      ) : null}

      {parkingLotsQuery.data ? (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              p: 2,
            }}
          >
            <TextField
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
              label="Search parking lots"
              onChange={handleSearchChange}
              placeholder="Search by name, type, city, state, or pincode"
              size="small"
              value={search}
            />
          </Box>
          <TableContainer
            sx={{
              maxHeight: { xs: 'calc(100vh - 280px)', md: 'calc(100vh - 260px)' },
              overflow: 'auto',
              scrollbarColor: 'rgba(31, 111, 235, 0.65) rgba(15, 23, 42, 0.08)',
              scrollbarWidth: 'thin',
              WebkitOverflowScrolling: 'touch',
              width: '100%',
              '&::-webkit-scrollbar': {
                height: 10,
                width: 10,
              },
              '&::-webkit-scrollbar-track': {
                bgcolor: 'rgba(15, 23, 42, 0.08)',
                borderRadius: 8,
              },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'rgba(31, 111, 235, 0.65)',
                borderRadius: 8,
              },
              '&::-webkit-scrollbar-thumb:hover': {
                bgcolor: 'primary.main',
              },
            }}
          >
          <Table size="small" stickyHeader sx={{ minWidth: 780 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: 'background.default', fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ bgcolor: 'background.default', fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ bgcolor: 'background.default', fontWeight: 700 }}>Location</TableCell>
                <TableCell sx={{ bgcolor: 'background.default', fontWeight: 700 }}>Pincode</TableCell>
                <TableCell sx={{ bgcolor: 'background.default', fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ bgcolor: 'background.default', fontWeight: 700 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedParkingLots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary" py={3} textAlign="center">
                      No parking lots found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredParkingLots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary" py={3} textAlign="center">
                      No parking lots match your search.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                visibleParkingLots.map((parkingLot) => (
                  <TableRow hover key={parkingLot.id} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ py: 1.75 }}>
                      <Stack spacing={0.5}>
                        <Typography fontWeight={600}>{parkingLot.name}</Typography>
                        <Typography color="text.secondary" variant="body2">
                          ID #{parkingLot.id}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ py: 1.75 }}>{parkingLot.type}</TableCell>
                    <TableCell sx={{ py: 1.75 }}>
                      {[parkingLot.address, parkingLot.city, parkingLot.state]
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </TableCell>
                    <TableCell sx={{ py: 1.75 }}>{parkingLot.pincode || '-'}</TableCell>
                    <TableCell sx={{ py: 1.75 }}>
                      <Chip
                        color={parkingLot.isActive ? 'success' : 'default'}
                        label={parkingLot.isActive ? 'Active' : 'Inactive'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.75 }}>
                      <Tooltip title="View Details">
                        <IconButton component={RouterLink} to={`/parking-lots/${parkingLot.id}`}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => openEditForm(parkingLot)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton color="error" onClick={() => setDeleteTarget(parkingLot)}>
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredParkingLots.length}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
            sx={{
              bgcolor: 'background.paper',
              borderTop: '1px solid',
              borderColor: 'divider',
              bottom: 0,
              position: 'sticky',
              zIndex: 2,
              '& .MuiTablePagination-toolbar': {
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                justifyContent: { xs: 'center', sm: 'flex-end' },
                minHeight: { xs: 72, sm: 52 },
                px: { xs: 1, sm: 2 },
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                m: 0,
              },
            }}
          />
        </Paper>
      ) : null}

      <Dialog fullWidth maxWidth="sm" onClose={closeForm} open={formOpen}>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editingParkingLot ? 'Edit Parking Lot' : 'Create Parking Lot'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Name"
                onChange={(event) => updateField('name', event.target.value)}
                required
                value={form.name}
              />
              <FormControl required>
                <InputLabel id="parking-lot-type-label">Type</InputLabel>
                <Select
                  label="Type"
                  labelId="parking-lot-type-label"
                  onChange={(event) => updateField('type', event.target.value as ParkingLotType)}
                  value={form.type}
                >
                  {parkingLotTypeOptions.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Address"
                onChange={(event) => updateField('address', event.target.value)}
                value={form.address}
              />
              <TextField
                label="City"
                onChange={(event) => updateField('city', event.target.value)}
                value={form.city}
              />
              <TextField
                label="State"
                onChange={(event) => updateField('state', event.target.value)}
                value={form.state}
              />
              <TextField
                label="Pincode"
                onChange={(event) => updateField('pincode', event.target.value)}
                value={form.pincode}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(form.isActive)}
                    onChange={(event) => updateField('isActive', event.target.checked)}
                  />
                }
                label="Active"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={isSaving} onClick={closeForm}>
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit" variant="contained">
              {editingParkingLot ? 'Save Changes' : 'Create'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        confirmLabel="Delete"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.name}? This will mark the parking lot inactive.`
            : ''
        }
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
        open={Boolean(deleteTarget)}
        title="Delete Parking Lot"
      />

      <Snackbar
        autoHideDuration={3500}
        onClose={() => setSnackbar(null)}
        open={Boolean(snackbar)}
      >
        <Alert
          onClose={() => setSnackbar(null)}
          severity={snackbar?.severity ?? 'success'}
          variant="filled"
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
