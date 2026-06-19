import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getParkingLot, getParkingLots } from '../../api/parkingLotsApi';
import { getSlotMap } from '../../api/slotMapApi';
import { EmptyState } from '../../components/common/EmptyState';
import { SearchField } from '../../components/common/SearchField';
import { ParkingLotWorkspaceShell } from '../../components/parking-lots/ParkingLotWorkspaceShell';
import { SlotDetailDrawer } from '../../components/slot-map/SlotDetailDrawer';
import { SlotMapGrid } from '../../components/slot-map/SlotMapGrid';
import { SlotMapLegend } from '../../components/slot-map/SlotMapLegend';
import { useUserRole } from '../../hooks/useUserRole';
import { getApiErrorMessage, isForbiddenError } from '../../lib/apiError';
import { isSlotStatus } from '../../lib/slotStatusNavigation';
import { SlotMapQuery, SlotMapSlotItem } from '../../types/slotMap';
import { SlotType, slotStatusOptions, slotTypeOptions } from '../../types/slot';

const ALL_FILTER = 'ALL';

function parseFloorId(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function VisualSlotMapPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const parkingLotId = Number(id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<SlotMapSlotItem | null>(null);
  const { isOperationalAdmin, isTenantAdmin } = useUserRole();
  const canManageLot = isOperationalAdmin || isTenantAdmin;

  const floorFilter = searchParams.get('floorId') ?? ALL_FILTER;
  const statusFilter = searchParams.get('status') ?? ALL_FILTER;
  const typeFilter = searchParams.get('vehicleType') ?? ALL_FILTER;

  const slotMapQuery: SlotMapQuery = {
    ...(floorFilter !== ALL_FILTER ? { floorId: parseFloorId(floorFilter) } : {}),
    ...(statusFilter !== ALL_FILTER && isSlotStatus(statusFilter)
      ? { status: statusFilter }
      : {}),
    ...(typeFilter !== ALL_FILTER ? { vehicleType: typeFilter as SlotType } : {}),
  };

  const parkingLotQuery = useQuery({
    queryKey: ['parking-lots', parkingLotId],
    queryFn: () => getParkingLot(parkingLotId),
    enabled: Number.isFinite(parkingLotId),
  });

  const slotMapQueryResult = useQuery({
    queryKey: ['slot-map', parkingLotId, slotMapQuery],
    queryFn: () => getSlotMap(parkingLotId, slotMapQuery),
    enabled: Number.isFinite(parkingLotId),
  });

  const parkingLotsQuery = useQuery({
    queryKey: ['parking-lots'],
    queryFn: getParkingLots,
  });

  const filteredGroups = useMemo(() => {
    const groups = slotMapQueryResult.data?.groups ?? [];
    const query = searchInput.trim().toLowerCase();

    if (!query) {
      return groups;
    }

    return groups
      .map((group) => ({
        ...group,
        slots: group.slots.filter((slot) => {
          const haystack = [
            slot.displayLabel,
            slot.slotNumber,
            slot.floorName,
            slot.status,
            slot.slotType,
          ]
            .join(' ')
            .toLowerCase();

          return haystack.includes(query);
        }),
      }))
      .filter((group) => group.slots.length > 0);
  }, [searchInput, slotMapQueryResult.data?.groups]);

  const updateFilter = (key: 'floorId' | 'status' | 'vehicleType', value: string) => {
    const next = new URLSearchParams(searchParams);

    if (value === ALL_FILTER) {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    setSearchParams(next, { replace: true });
  };

  const handleLotChange = (event: SelectChangeEvent<string>) => {
    const nextLotId = event.target.value;
    navigate(`/parking-lots/${nextLotId}/slot-map?${searchParams.toString()}`);
  };

  const mapData = slotMapQueryResult.data;
  const parkingLot = parkingLotQuery.data;

  if (parkingLotQuery.isLoading) {
    return (
      <Stack alignItems="center" py={8}>
        <CircularProgress />
      </Stack>
    );
  }

  if (parkingLotQuery.error) {
    return (
      <Alert severity={isForbiddenError(parkingLotQuery.error) ? 'warning' : 'error'}>
        {isForbiddenError(parkingLotQuery.error)
          ? 'Access denied. You do not have permission to view this parking lot.'
          : getApiErrorMessage(parkingLotQuery.error, 'Could not load parking lot.')}
      </Alert>
    );
  }

  if (!parkingLot) {
    return null;
  }

  return (
    <ParkingLotWorkspaceShell
      activeTab="visual-map"
      canManageLot={canManageLot}
      parkingLot={parkingLot}
    >
      {parkingLotsQuery.data && parkingLotsQuery.data.length > 1 ? (
        <FormControl size="small" sx={{ maxWidth: 320 }}>
          <InputLabel id="slot-map-lot-label">Parking lot</InputLabel>
          <Select
            label="Parking lot"
            labelId="slot-map-lot-label"
            onChange={handleLotChange}
            value={String(parkingLotId)}
          >
            {parkingLotsQuery.data.map((lot) => (
              <MenuItem key={lot.id} value={String(lot.id)}>
                {lot.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2 }}>
        <Stack spacing={1.5}>
          <Stack
            alignItems={{ xs: 'stretch', md: 'center' }}
            direction={{ xs: 'column', md: 'row' }}
            flexWrap="wrap"
            gap={1.5}
            useFlexGap
          >
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="slot-map-floor-label">Floor</InputLabel>
              <Select
                label="Floor"
                labelId="slot-map-floor-label"
                onChange={(event) => updateFilter('floorId', event.target.value)}
                value={floorFilter}
              >
                <MenuItem value={ALL_FILTER}>All floors</MenuItem>
                {(mapData?.floors ?? []).map((floor) => (
                  <MenuItem key={floor.id} value={String(floor.id)}>
                    {floor.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="slot-map-status-label">Status</InputLabel>
              <Select
                label="Status"
                labelId="slot-map-status-label"
                onChange={(event) => updateFilter('status', event.target.value)}
                value={statusFilter}
              >
                <MenuItem value={ALL_FILTER}>All statuses</MenuItem>
                {slotStatusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="slot-map-type-label">Vehicle type</InputLabel>
              <Select
                label="Vehicle type"
                labelId="slot-map-type-label"
                onChange={(event) => updateFilter('vehicleType', event.target.value)}
                value={typeFilter}
              >
                <MenuItem value={ALL_FILTER}>All types</MenuItem>
                {slotTypeOptions.map((slotType) => (
                  <MenuItem key={slotType} value={slotType}>
                    {slotType.charAt(0) + slotType.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ flex: 1, minWidth: { md: 220 } }}>
              <SearchField
                label="Search slots"
                onChange={(event) => setSearchInput(event.target.value)}
                onClear={() => setSearchInput('')}
                placeholder="Slot number or floor"
                value={searchInput}
              />
            </Box>
          </Stack>

          {mapData ? <SlotMapLegend legend={mapData.legend} /> : null}
        </Stack>
      </Paper>

      {slotMapQueryResult.isLoading ? (
        <Stack alignItems="center" py={8}>
          <CircularProgress />
        </Stack>
      ) : null}

      {slotMapQueryResult.error ? (
        <Alert severity={isForbiddenError(slotMapQueryResult.error) ? 'warning' : 'error'}>
          {isForbiddenError(slotMapQueryResult.error)
            ? 'Access denied. You do not have permission to view this slot map.'
            : getApiErrorMessage(slotMapQueryResult.error, 'Could not load the visual slot map.')}
        </Alert>
      ) : null}

      {mapData && filteredGroups.length === 0 ? (
        <EmptyState
          description="Try another floor, status filter, or search term."
          title="No slots match the current filters"
        />
      ) : null}

      {mapData && filteredGroups.length > 0 ? (
        <SlotMapGrid
          groups={filteredGroups}
          onSelectSlot={setSelectedSlot}
          selectedSlotId={selectedSlot?.id ?? null}
        />
      ) : null}

      {mapData ? (
        <Typography color="text.secondary" variant="caption">
          Last updated {new Date(mapData.lastUpdated).toLocaleString()}
        </Typography>
      ) : null}

      <SlotDetailDrawer
        onClose={() => setSelectedSlot(null)}
        open={selectedSlot != null}
        slot={selectedSlot}
      />
    </ParkingLotWorkspaceShell>
  );
}