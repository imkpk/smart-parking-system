import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { getPublicParkingFinderResults } from '../../api/publicParkingFinderApi';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { QUERY_META_SUPPRESS_CONSOLE_ERROR } from '../../lib/createAppQueryClient';
import { formatStatusLabel } from '../../lib/formatters';
import { useAuth } from '../../providers/AuthProvider';
import { PublicParkingFinderQuery } from '../../types/publicParkingFinder';
import { VehicleType, vehicleTypeOptions } from '../../types/vehicle';

type VehicleFilter = VehicleType | 'ANY';

function formatLocation(result: {
  address: string | null;
  city: string | null;
  state: string | null;
}) {
  return [result.address, result.city, result.state].filter(Boolean).join(', ') || 'Location not listed';
}

function formatPrice(result: {
  baseHourlyRate: string | null;
  currency: string | null;
}) {
  if (!result.baseHourlyRate) {
    return null;
  }
  return `${result.currency ?? 'INR'} ${result.baseHourlyRate}/hr`;
}

export function ParkingFinderPage() {
  const { token } = useAuth();
  const [cityInput, setCityInput] = useState('');
  const [debouncedCity, setDebouncedCity] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>('ANY');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedCity(cityInput.trim());
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [cityInput]);

  const queryParams = useMemo<PublicParkingFinderQuery>(() => {
    const params: PublicParkingFinderQuery = {};
    if (debouncedCity) {
      params.city = debouncedCity;
    }
    if (vehicleFilter !== 'ANY') {
      params.vehicleType = vehicleFilter;
    }
    return params;
  }, [debouncedCity, vehicleFilter]);

  const resultsQuery = useQuery({
    queryKey: ['public-parking-finder', queryParams],
    queryFn: () => getPublicParkingFinderResults(queryParams),
    staleTime: 30_000,
    retry: false,
    meta: {
      [QUERY_META_SUPPRESS_CONSOLE_ERROR]: true,
    },
  });

  const results = resultsQuery.data ?? [];

  return (
    <Box
      sx={{
        maxWidth: 960,
        mx: 'auto',
        px: { xs: 2, md: 3 },
        py: { xs: 3, md: 4 },
      }}
    >
      <PageHeader
        description="Search public parking lots with live slot availability and start an authenticated booking."
        title="Find parking"
      />

      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', mb: 3, p: 2.5 }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label="City"
            onChange={(event) => setCityInput(event.target.value)}
            placeholder="e.g. Hyderabad"
            value={cityInput}
          />
          <FormControl fullWidth>
            <InputLabel id="finder-vehicle-type-label">Vehicle type</InputLabel>
            <Select
              label="Vehicle type"
              labelId="finder-vehicle-type-label"
              onChange={(event) => setVehicleFilter(event.target.value as VehicleFilter)}
              value={vehicleFilter}
            >
              <MenuItem value="ANY">Any</MenuItem>
              {vehicleTypeOptions.map((vehicleType) => (
                <MenuItem key={vehicleType} value={vehicleType}>
                  {formatStatusLabel(vehicleType)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {resultsQuery.isLoading ? (
        <Stack alignItems="center" py={8}>
          <CircularProgress />
        </Stack>
      ) : null}

      {resultsQuery.isError ? (
        <Alert severity="error">Could not load parking lots. Please try again shortly.</Alert>
      ) : null}

      {!resultsQuery.isLoading && !resultsQuery.isError && results.length === 0 ? (
        <EmptyState
          description="Try another city or vehicle type, or check back when more public lots are listed."
          illustration="park"
          title="No public parking lots found"
        />
      ) : null}

      {!resultsQuery.isLoading && !resultsQuery.isError && results.length > 0 ? (
        <Stack spacing={2}>
          {results.map((result) => {
            const priceLabel = formatPrice(result);
            const bookingPath = `/bookings/new?parkingLotId=${result.id}`;
            const loginPath = `/login?${new URLSearchParams({ redirect: bookingPath }).toString()}`;
            return (
              <Card key={result.id} variant="outlined">
                <CardContent>
                  <Stack spacing={1.25}>
                    <Stack
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Typography variant="h6">{result.name}</Typography>
                        <Typography color="text.secondary" variant="body2">
                          {result.organizationName}
                        </Typography>
                      </Box>
                      <Stack direction="row" flexWrap="wrap" spacing={1}>
                        <Chip label={formatStatusLabel(result.type)} size="small" />
                        <Chip
                          color={result.bookable ? 'success' : 'default'}
                          label={result.bookable ? 'Bookable' : 'No slots available'}
                          size="small"
                        />
                      </Stack>
                    </Stack>
                    <Typography color="text.secondary" variant="body2">
                      {formatLocation(result)}
                    </Typography>
                    <Typography variant="body2">
                      {result.availableSlots} of {result.totalSlots} slots available
                      {result.availabilityType === 'LIVE' ? ' (live)' : ''}
                    </Typography>
                    {priceLabel ? (
                      <Typography variant="body2">From {priceLabel}</Typography>
                    ) : null}
                    {result.openingHours ? (
                      <Typography color="text.secondary" variant="body2">
                        Hours: {result.openingHours}
                      </Typography>
                    ) : null}
                    {result.distanceKm != null ? (
                      <Typography color="text.secondary" variant="body2">
                        ~{result.distanceKm} km away
                      </Typography>
                    ) : null}
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  {result.bookable ? (
                    <Button
                      component={RouterLink}
                      to={token ? bookingPath : loginPath}
                      variant="contained"
                    >
                      {token ? 'Book' : 'Sign in to book'}
                    </Button>
                  ) : (
                    <Button disabled variant="contained">
                      No slots available
                    </Button>
                  )}
                </CardActions>
              </Card>
            );
          })}
        </Stack>
      ) : null}
    </Box>
  );
}
