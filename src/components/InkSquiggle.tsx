'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { squigglePaths } from './LineSquiggles';

/** A red pen squiggle under a few words, the same stroke the names page uses. */
export function InkSquiggle({ children, seed = 1 }: { children: ReactNode; seed?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () =>
      setSize((previous) =>
        previous.width === element.offsetWidth && previous.height === element.offsetHeight
          ? previous
          : { width: element.offsetWidth, height: element.offsetHeight },
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <span ref={ref} className="ink-squiggle">
      {children}
      {size.width > 0 && (
        <svg className="squiggle-ink" aria-hidden="true">
          {squigglePaths(0, size.width, size.height * 0.95, seed).map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      )}
    </span>
  );
}
