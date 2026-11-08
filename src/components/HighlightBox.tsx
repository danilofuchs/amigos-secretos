'use client';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './HighlightBox.module.css';

const HIGHLIGHTERS = [
  'rgb(226 92 118 / 80%)',
  'rgb(52 164 98 / 80%)',
  'rgb(232 138 48 / 82%)',
  'rgb(132 98 222 / 80%)',
  'rgb(36 152 170 / 80%)',
];
let nextHighlighter = 0;

function seededWobble(seed: number) {
  return (n: number) => {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x) - 0.5;
  };
}

// Drawn at the field's real size so corners and wobble keep their scale however tall it grows.
export function highlightPath(width: number, height: number, seed: number) {
  const wobble = seededWobble(seed),
    r = 9,
    amp = 1.6;
  const edge = (x0: number, y0: number, x1: number, y1: number, salt: number) => {
    const length = Math.hypot(x1 - x0, y1 - y0),
      steps = Math.max(1, Math.round(length / 70));
    const nx = -(y1 - y0) / length,
      ny = (x1 - x0) / length;
    let d = '';
    for (let i = 1; i <= steps; i++) {
      const t0 = (i - 0.5) / steps,
        t1 = i / steps,
        o = wobble(salt + i) * amp * 2;
      d += ` Q${(x0 + (x1 - x0) * t0 + nx * o).toFixed(1)} ${(y0 + (y1 - y0) * t0 + ny * o).toFixed(1)} ${(x0 + (x1 - x0) * t1).toFixed(1)} ${(y0 + (y1 - y0) * t1).toFixed(1)}`;
    }
    return d;
  };
  const w = width,
    h = height,
    k = wobble(99) * 2;
  return (
    `M${r} ${2 + k}` +
    edge(r, 2 + k, w - r, 2, 1) +
    ` Q${w - 1} 1 ${w - 2} ${r}` +
    edge(w - 2, r, w - 1, h - r, 20) +
    ` Q${w - 1} ${h - 1} ${w - r} ${h - 2}` +
    edge(w - r, h - 2, r, h - 1, 40) +
    ` Q1 ${h - 1} 2 ${h - r}` +
    edge(2, h - r, 1.5, r + 4, 60) +
    ` Q1 2 ${r + 14} ${0.5 + k}`
  );
}

/** A notebook highlighter box drawn around whatever field inside it has keyboard focus. */
export function HighlightBox({
  children,
  className = '',
  inline = false,
}: {
  children: ReactNode;
  className?: string | undefined;
  inline?: boolean;
}) {
  const [color, setColor] = useState(HIGHLIGHTERS[0]);
  const boxRef = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0, seed: 1 });
  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setBox((previous) => ({
        ...previous,
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <span
      className={`${styles.wrap} ${inline ? styles.inline : ''} ${className}`}
      onFocus={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setColor(HIGHLIGHTERS[nextHighlighter % HIGHLIGHTERS.length]);
        setBox((previous) => ({ ...previous, seed: ++nextHighlighter }));
      }}
    >
      {children}
      <svg
        ref={boxRef}
        className={styles.focusBox}
        data-highlight=""
        width={box.width}
        height={box.height}
        viewBox={`0 0 ${box.width} ${box.height}`}
        aria-hidden="true"
      >
        {box.width > 0 && (
          <path d={highlightPath(box.width, box.height, box.seed)} stroke={color} />
        )}
      </svg>
    </span>
  );
}
