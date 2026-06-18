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
      spacing={1}
      sx={{ maxWidth: '100%', px: 0.5, rowGap: 1 }}
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
            border: 0,
            borderRadius: 1,
            color: 'text.primary',
            cursor: 'pointer',
            display: 'inline-flex',
            font: 'inherit',
            gap: 0.75,
            maxWidth: '100%',
            px: 0.75,
            py: 0.25,
            '&:hover': {
              bgcolor: 'action.hover',
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
              height: 10,
              width: 10,
            }}
          />
          <Typography component="span" sx={{ lineHeight: 1.2, textAlign: 'left' }} variant="caption">
            {item.label}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}