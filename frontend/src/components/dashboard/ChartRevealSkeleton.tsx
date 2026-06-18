import { Box, CircularProgress, keyframes } from '@mui/material';
import { getResponsiveDonutDimensions } from './donutChartConfig';

const pulseRing = keyframes`
  0%, 100% {
    opacity: 0.45;
    transform: scale(0.96);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
`;

export function DonutChartRevealSkeleton({ containerWidth }: { containerWidth?: number }) {
  const donut = getResponsiveDonutDimensions(containerWidth ?? 300);

  return (
    <Box
      aria-hidden
      sx={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minHeight: donut.pieHeight,
        position: 'relative',
        width: '100%',
      }}
    >
      <Box
        sx={{
          alignItems: 'center',
          animation: `${pulseRing} 1.4s ease-in-out infinite`,
          border: `${donut.skeletonBorder}px solid`,
          borderColor: 'action.hover',
          borderRadius: '50%',
          display: 'flex',
          height: donut.skeletonSize,
          justifyContent: 'center',
          width: donut.skeletonSize,
        }}
      >
        <CircularProgress size={32} thickness={4} />
      </Box>
    </Box>
  );
}

export function UtilizationBarsRevealSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Box aria-hidden sx={{ display: 'grid', gap: 1.75 }}>
      {Array.from({ length: rows }, (_, index) => (
        <Box key={index} sx={{ display: 'grid', gap: 0.75 }}>
          <Box
            sx={{
              bgcolor: 'action.hover',
              borderRadius: 0.75,
              height: 14,
              width: `${72 - index * 6}%`,
            }}
          />
          <Box
            sx={{
              animation: `${pulseRing} 1.4s ease-in-out infinite`,
              animationDelay: `${index * 120}ms`,
              bgcolor: 'action.hover',
              borderRadius: 1,
              height: 8,
            }}
          />
        </Box>
      ))}
    </Box>
  );
}