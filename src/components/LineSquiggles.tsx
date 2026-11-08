'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * An uneven pen squiggle that only grows at its end: every wobble depends on its distance from
 * the start, so typing more letters extends the stroke without reshaping what is already drawn.
 * Longer marks get a pen lift partway through.
 */
export function squigglePaths(x0: number, x1: number, y: number, seed: number) {
  const noise = (n: number) => {
    const v = Math.sin(seed * 91.7 + n * 12.9898) * 43758.5453;
    return v - Math.floor(v);
  };
  const slant = (noise(99) - 0.5) * 0.03;
  const swell = noise(77) * Math.PI * 2;
  const lift = x0 + 70 + noise(55) * 60;
  const baseline = (at: number) =>
    y + (at - x0) * slant + Math.sin((at - x0) / 38 + swell) * 1.3 + Math.sin((at - x0) / 13) * 0.4;
  const strokes: string[] = [];
  let x = x0 - 2 - noise(3) * 3,
    i = 1,
    up = noise(0) > 0.5,
    lifted = false;
  let d = `M${(x - 2).toFixed(1)} ${(baseline(x) - 2.5).toFixed(1)} Q${(x - 1).toFixed(1)} ${(baseline(x) + 1).toFixed(1)} ${x.toFixed(1)} ${baseline(x).toFixed(1)}`;
  const end = x1 + 3;
  while (x < end) {
    const step = 5 + noise(i) * 8;
    const height = (1 + noise(i + 50) * 2.6) * (0.75 + 0.5 * Math.sin(i * 0.7 + swell));
    if (!lifted && x + step >= lift && end > lift + 20) {
      lifted = true;
      strokes.push(d);
      x += step + 3 + noise(i + 7) * 3;
      d = `M${x.toFixed(1)} ${(baseline(x) + (up ? -0.8 : 0.8)).toFixed(1)}`;
      i++;
      continue;
    }
    const nx = Math.min(x + step, end);
    const cx = x + (nx - x) * (0.4 + noise(i + 20) * 0.2);
    const h = height * Math.min(1, (nx - x) / step);
    d += ` Q${cx.toFixed(1)} ${(baseline(cx) + (up ? -h : h)).toFixed(1)} ${nx.toFixed(1)} ${baseline(nx).toFixed(1)}`;
    x = nx;
    up = !up;
    i++;
  }
  strokes.push(d);
  return strokes;
}

const COPIED = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'wordSpacing',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderLeftWidth',
] as const;

/**
 * Underlines chosen lines of a textarea with a red pen squiggle, live while typing. A transparent
 * copy of the text sits exactly over the field, so each mark lands under its own words.
 */
export function LineSquiggles({
  fieldId,
  text,
  marked,
}: {
  fieldId: string;
  text: string;
  marked: ReadonlySet<number>;
}) {
  const copyRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<SVGSVGElement>(null);
  const drawn = useRef(new Map<string, number>());
  const [style, setStyle] = useState<Record<string, string>>({});
  const [marks, setMarks] = useState<{ key: string; d: string }[]>([]);
  const lines = text.split('\n');
  const markedKey = [...marked].join(',');

  useLayoutEffect(() => {
    const field = document.getElementById(fieldId);
    const container = copyRef.current?.offsetParent;
    if (!field || !container) return;
    const copy = () => {
      const computed = getComputedStyle(field);
      const next: Record<string, string> = {};
      for (const key of COPIED) next[key] = computed[key];
      const box = field.getBoundingClientRect(),
        outer = container.getBoundingClientRect();
      next.top = `${box.top - outer.top}px`;
      next.left = `${box.left - outer.left}px`;
      next.width = `${box.width}px`;
      next.height = `${box.height}px`;
      setStyle((previous) =>
        Object.keys(next).every((key) => previous[key] === next[key]) ? previous : next,
      );
    };
    copy();
    const observer = new ResizeObserver(copy);
    observer.observe(field);
    return () => observer.disconnect();
  }, [fieldId]);

  useLayoutEffect(() => {
    const copy = copyRef.current;
    if (!copy) return;
    const next = [...copy.querySelectorAll<HTMLSpanElement>('[data-line]')]
      .filter((span) => marked.has(Number(span.dataset.line)) && span.textContent?.trim())
      .flatMap((span) => {
        const line = Number(span.dataset.line);
        const row = span.parentElement!;
        const y = row.offsetTop + row.offsetHeight * 0.9;
        return squigglePaths(span.offsetLeft, span.offsetLeft + span.offsetWidth, y, line + 1).map(
          (d, stroke) => ({ key: `${line}:${stroke}`, d }),
        );
      });
    setMarks((previous) =>
      previous.length === next.length && previous.every((m, i) => m.d === next[i]!.d)
        ? previous
        : next,
    );
    // The marks follow the text, the marked lines and the copied typography.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [text, markedKey, style]);

  // Ink only the part of each stroke that is new, so typing extends a mark instead of redrawing it.
  useLayoutEffect(() => {
    const ink = inkRef.current;
    if (!ink) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const present = new Set<string>();
    for (const path of ink.querySelectorAll<SVGPathElement>('path[data-key]')) {
      const key = path.dataset.key!;
      present.add(key);
      const total = path.getTotalLength();
      const before = Math.min(drawn.current.get(key) ?? 0, total);
      drawn.current.set(key, total);
      path.style.strokeDasharray = `${total} ${total}`;
      path.style.strokeDashoffset = '0';
      if (still || total - before < 0.5) continue;
      path.animate([{ strokeDashoffset: total - before }, { strokeDashoffset: 0 }], {
        duration: Math.min(450, 120 + (total - before) * 2.5),
        easing: 'ease-out',
        fill: 'backwards',
      });
    }
    for (const key of drawn.current.keys()) if (!present.has(key)) drawn.current.delete(key);
  }, [marks]);

  return (
    <div ref={copyRef} className="line-squiggles" style={style as CSSProperties} aria-hidden="true">
      {marked.size > 0 &&
        lines.map((line, index) => (
          // Lines are positional; the index is the identity here.
          // oxlint-disable-next-line react/no-array-index-key
          <div key={index}>
            <span data-line={index}>{line || ' '}</span>
          </div>
        ))}
      <svg ref={inkRef} className="squiggle-ink">
        {marks.map((mark) => (
          <path key={mark.key} data-key={mark.key} d={mark.d} />
        ))}
      </svg>
    </div>
  );
}
