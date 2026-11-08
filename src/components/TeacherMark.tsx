'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/** A loose, slightly overshooting loop, like a teacher circling a mistake in red pen. */
function loopPath(width: number, height: number) {
  const cx = width / 2,
    cy = height / 2,
    rx = width / 2 + 22,
    ry = height / 2 + 11;
  const points: [number, number][] = [];
  // A rounded box between an ellipse and a rectangle, drawn past its start so the ends overlap.
  for (let i = 0; i <= 30; i++) {
    const a = -2.5 + (i / 26) * Math.PI * 2;
    const cos = Math.cos(a),
      sin = Math.sin(a);
    const wobble = 1 + Math.sin(i * 1.3) * 0.012 + (i > 26 ? (i - 26) * 0.012 : 0);
    points.push([
      cx + Math.sign(cos) * Math.abs(cos) ** 0.55 * rx * wobble,
      cy + Math.sign(sin) * Math.abs(sin) ** 0.6 * ry * wobble,
    ]);
  }
  // Catmull-Rom through the points keeps the pen line round instead of faceted.
  let d = `M${points[0]![0].toFixed(1)} ${points[0]![1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!,
      p1 = points[i]!,
      p2 = points[i + 1]!,
      p3 = points[Math.min(points.length - 1, i + 2)]!;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]!.toFixed(1)} ${c1[1]!.toFixed(1)} ${c2[0]!.toFixed(1)} ${c2[1]!.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Circles its field and writes the correction underneath while `error` is set. */
export function TeacherMark({
  error,
  children,
  className = '',
}: {
  error?: string | undefined;
  children: (describedBy: string | undefined) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height),
        });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <span className={`teacher-mark ${error ? 'marked' : ''} ${className}`}>
      <span ref={ref} className="teacher-mark-target">
        {children(error ? id : undefined)}
        {error && size.width > 0 && (
          <svg
            className="teacher-loop"
            width={size.width + 40}
            height={size.height + 36}
            viewBox={`-20 -18 ${size.width + 40} ${size.height + 36}`}
            aria-hidden="true"
          >
            <path d={loopPath(size.width, size.height)} pathLength={1} />
          </svg>
        )}
      </span>
      {error && (
        <span id={id} className="teacher-note" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
