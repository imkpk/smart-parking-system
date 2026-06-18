import { Box, Stack, Typography } from '@mui/material';

export function SlotStatusChartLegend({
  items,
  onItemClick,
}: {
  items: Array<{ color: string; label: string }>;
  onItemClick: (label: string) => void;
}) {
  return (
    <Stack
      aria-label="Slot status legend"
      direction="row"
      flexWrap="wrap"
      justifyContent="center"
      role="list"
      spacing={1.25}
      sx={{ maxWidth: '100%', px: 0.5, rowGap: 1.25 }}
      useFlexGap
    >
      {items.map((item) => (
        <Box
          component="button"
          key={item.label}
          onClick={() => onItemClick(item.label)}
          role="listitem"
          sx={{
            alignItems: 'center',
            appearance: 'none',
            background: 'none',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            color: 'text.primary',
            cursor: 'pointer',
            display: 'inline-flex',
            font: 'inherit',
            gap: 0.875,
            maxWidth: '100%',
            px: 1,
            py: 0.5,
            '&:hover': {
              bgcolor: 'action.hover',
              borderColor: 'text.disabled',
            },
          }}
          type="button"
        >
          <Box
            aria-hidden
            sx={{
              bgcolor: item.color,
              borderRadius: '50%',
              flexShrink: 0,
              height: 12,
              width: 12,
            }}
          />
          <Typography component="span" fontWeight={500} sx={{ lineHeight: 1.3, textAlign: 'left' }} variant="body2">
            {item.label}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}