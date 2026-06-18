import { useMediaQuery } from '@mui/material';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

type UseScrollRevealOptions = {
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
};

export function useScrollReveal({
  rootMargin = '0px 0px -6% 0px',
  threshold = 0.15,
  triggerOnce = true,
}: UseScrollRevealOptions = {}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const shouldAnimate = !prefersReducedMotion;
  const isActive = !shouldAnimate || isInView;

  const replay = useCallback(() => {
    if (!shouldAnimate) {
      return;
    }

    setAnimationKey((current) => current + 1);
  }, [shouldAnimate]);

  useLayoutEffect(() => {
    if (!shouldAnimate) {
      setIsInView(true);
      return;
    }

    const element = ref.current;

    if (!element || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);

          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, shouldAnimate, threshold, triggerOnce]);

  return {
    animationKey,
    isActive,
    isInView: isActive,
    ref,
    replay,
    shouldAnimate,
  };
}