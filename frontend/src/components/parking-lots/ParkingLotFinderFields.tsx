import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import {
  ParkingLotPayload,
  ParkingLotVisibility,
  parkingLotVisibilityOptions,
} from '../../types/parkingLot';

export function ParkingLotFinderFields({
  form,
  onChange,
}: {
  form: ParkingLotPayload;
  onChange: <K extends keyof ParkingLotPayload>(field: K, value: ParkingLotPayload[K]) => void;
}) {
  return (
    <Stack spacing={2}>
      <FormControl>
        <InputLabel id="parking-lot-visibility-label">Visibility</InputLabel>
        <Select
          label="Visibility"
          labelId="parking-lot-visibility-label"
          onChange={(event) =>
            onChange('visibility', event.target.value as ParkingLotVisibility)
          }
          value={form.visibility ?? 'PRIVATE'}
        >
          {parkingLotVisibilityOptions.map((visibility) => (
            <MenuItem key={visibility} value={visibility}>
              {visibility}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>Only PUBLIC lots appear in Parking Finder.</FormHelperText>
      </FormControl>
      <TextField
        helperText="Between -90 and 90"
        inputProps={{ step: 'any' }}
        label="Latitude"
        onChange={(event) => {
          const value = event.target.value.trim();
          onChange('latitude', value === '' ? null : Number(value));
        }}
        type="number"
        value={form.latitude ?? ''}
      />
      <TextField
        helperText="Between -180 and 180"
        inputProps={{ step: 'any' }}
        label="Longitude"
        onChange={(event) => {
          const value = event.target.value.trim();
          onChange('longitude', value === '' ? null : Number(value));
        }}
        type="number"
        value={form.longitude ?? ''}
      />
      <TextField
        helperText="Leave empty if pricing is not configured"
        inputProps={{ min: 0, step: '0.01' }}
        label="Base hourly rate"
        onChange={(event) => {
          const value = event.target.value.trim();
          onChange('baseHourlyRate', value === '' ? null : Number(value));
        }}
        type="number"
        value={form.baseHourlyRate ?? ''}
      />
      <TextField
        label="Currency"
        onChange={(event) => onChange('currency', event.target.value)}
        value={form.currency ?? 'INR'}
      />
      <TextField
        label="Opening hours"
        onChange={(event) => onChange('openingHours', event.target.value)}
        placeholder="e.g. Mon–Sun 6:00 AM – 11:00 PM"
        value={form.openingHours ?? ''}
      />
    </Stack>
  );
}