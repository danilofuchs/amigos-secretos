'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * The spiral binding: `back` is the wire behind the pages, `front` the arcs over a page and
 * `holes` the punched holes, drawn on the page so they swing out from under the wire as it turns.
 */
export function NotebookRings({ side }: { side: 'back' | 'front' | 'holes' }) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(9);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const ring = element.firstElementChild as HTMLElement | null;
      if (!ring) return;
      const pitch = ring.offsetHeight + parseFloat(getComputedStyle(element).rowGap);
      setCount(Math.max(2, Math.floor((element.clientHeight - ring.offsetHeight) / pitch) + 1));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`notebook-rings notebook-rings-${side}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  );
}
