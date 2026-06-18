import { useLayoutEffect, useRef, useState } from 'react';

export function useContainerWidth(fallbackWidth = 0) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(fallbackWidth);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const updateWidth = () => {
      const nextWidth = element.getBoundingClientRect().width;

      if (nextWidth > 0) {
        setWidth((current) => (current === nextWidth ? current : nextWidth));
      }
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, width };
}