import { LinearProgress } from '@mui/material';
import { useEffect, useState } from 'react';

const BAR_ANIMATION_MS = 900;

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

export function useAnimatedNumber(
  target: number,
  isActive: boolean,
  { delay = 0, duration = BAR_ANIMATION_MS }: { delay?: number; duration?: number } = {},
) {
  const [value, setValue] = useState(() => {
    if (!isActive) {
      return 0;
    }

    if (import.meta.env.VITEST) {
      return target;
    }

    return 0;
  });

  useEffect(() => {
    if (!isActive) {
      setValue(0);
      return;
    }

    if (import.meta.env.VITEST) {
      setValue(target);
      return;
    }

    let frame = 0;
    const startAt = performance.now() + delay;

    const tick = (now: number) => {
      if (now < startAt) {
        frame = requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min((now - startAt) / duration, 1);
      setValue(Math.round(target * easeOutCubic(progress)));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [delay, duration, isActive, target]);

  return value;
}

export function AnimatedUtilizationBar({
  color,
  delay = 0,
  isActive,
  label,
  value,
}: {
  color: 'primary' | 'success' | 'info' | 'warning' | 'secondary';
  delay?: number;
  isActive: boolean;
  label: string;
  value: number;
}) {
  const animatedValue = useAnimatedNumber(Math.min(value, 100), isActive, { delay });

  return (
    <LinearProgress
      aria-label={label}
      color={color}
      sx={{
        borderRadius: 1,
        height: 8,
        '& .MuiLinearProgress-bar': {
          transition: isActive ? `transform ${BAR_ANIMATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
          transitionDelay: isActive ? `${delay}ms` : '0ms',
        },
      }}
      value={animatedValue}
      variant="determinate"
    />
  );
}