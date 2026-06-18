import { Box, Stack, Typography } from '@mui/material';
import { SlotMapFloorGroup, SlotMapSlotItem } from '../../types/slotMap';
import { SlotMapCard } from './SlotMapCard';

export function SlotMapGrid({
  groups,
  onSelectSlot,
  selectedSlotId,
}: {
  groups: SlotMapFloorGroup[];
  onSelectSlot: (slot: SlotMapSlotItem) => void;
  selectedSlotId: number | null;
}) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2.5}>
      {groups.map((group) => (
        <Stack key={group.floorId} spacing={1.25}>
          <Typography component="h2" fontWeight={600} variant="subtitle1">
            {group.floorName}
            {group.level != null ? ` · Level ${group.level}` : ''}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 1.25,
              gridTemplateColumns: {
                xs: 'repeat(auto-fill, minmax(104px, 1fr))',
                sm: 'repeat(auto-fill, minmax(112px, 1fr))',
                md: 'repeat(auto-fill, minmax(120px, 1fr))',
              },
              maxHeight: { xs: 'none', md: 480 },
              overflowY: { xs: 'visible', md: 'auto' },
              pr: { md: 0.5 },
            }}
          >
            {group.slots.map((slot) => (
              <SlotMapCard
                isSelected={selectedSlotId === slot.id}
                key={slot.id}
                onSelect={onSelectSlot}
                slot={slot}
              />
            ))}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}