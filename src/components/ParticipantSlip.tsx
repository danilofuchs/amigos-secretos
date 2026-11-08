'use client';
import { memo, useMemo, useState, type CSSProperties } from 'react';
import { Icon } from './Icon';
import styles from './ParticipantSlip.module.css';

type Point = [xPct: number, xPx: number, y: string];

function seeded(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STEPS_PER_PANEL = 5;

function tornPanels(rand: () => number) {
  const n = STEPS_PER_PANEL * 4;
  const top = Array.from({ length: n + 1 }, () => (rand() * 2.6).toFixed(2));
  const bottom = Array.from({ length: n + 1 }, () => (rand() * 2.6).toFixed(2));
  const side = () => Array.from({ length: 6 }, (_, k) => [k / 5, rand() * 2.4] as const);
  const left = side(),
    right = side();
  const polygon = (points: Point[]) =>
    `polygon(${points.map(([pct, px, y]) => `calc(${pct.toFixed(2)}% + ${px.toFixed(2)}px) ${y}`).join(', ')})`;
  const panel = (i: number) => {
    const span = top.slice(i * STEPS_PER_PANEL, i * STEPS_PER_PANEL + STEPS_PER_PANEL + 1);
    const spanBottom = bottom.slice(i * STEPS_PER_PANEL, i * STEPS_PER_PANEL + STEPS_PER_PANEL + 1);
    const pts: Point[] = span.map((y, k) => [(k / STEPS_PER_PANEL) * 100, 0, `${y}px`]);
    if (i === 3) right.forEach(([t, px]) => pts.push([100, -px, `${(t * 100).toFixed(1)}%`]));
    spanBottom
      .map((y, k) => [(k / STEPS_PER_PANEL) * 100, 0, `calc(100% - ${y}px)`] as Point)
      .reverse()
      .forEach((p) => pts.push(p));
    if (i === 0)
      [...left].reverse().forEach(([t, px]) => pts.push([0, px, `${(t * 100).toFixed(1)}%`]));
    const mirrored = pts.map(([pct, px, y]): Point => [100 - pct, -px, y]);
    return { front: polygon(pts), back: polygon(mirrored) };
  };
  return [panel(0), panel(1), panel(2), panel(3)] as const;
}

const ms = (rand: () => number, min: number, max: number) => Math.round(min + rand() * (max - min));

function slipMotion(id: string, staggerMs: number) {
  const rand = seeded(id);
  const panels = tornPanels(rand);
  const start = staggerMs + ms(rand, 0, 170);
  const tear = ms(rand, 300, 430);
  const fold1At = start + tear + ms(rand, 40, 150);
  const fold1 = ms(rand, 420, 600);
  const fold2At = fold1At + fold1 + ms(rand, 60, 210);
  const fold2 = ms(rand, 380, 540);
  const settleAt = fold2At + fold2 - 60;
  const vars = {
    '--start': `${start}ms`,
    '--tear': `${tear}ms`,
    '--fold1-at': `${fold1At}ms`,
    '--fold1': `${fold1}ms`,
    '--fold2-at': `${fold2At}ms`,
    '--fold2': `${fold2}ms`,
    '--settle-at': `${settleAt}ms`,
    '--settle': `${ms(rand, 260, 380)}ms`,
    '--tear-x': `${(rand() * 4 - 2).toFixed(1)}px`,
    '--tear-turn': `${(rand() * 2.4 - 1.2).toFixed(2)}deg`,
    '--tilt': `${(rand() * 9 - 4.5).toFixed(1)}deg`,
  } as CSSProperties;
  return { panels, vars };
}

function Panel({
  index,
  name,
  clip,
}: {
  index: number;
  name: string;
  clip: { front: string; back: string };
}) {
  return (
    <div className={styles.panel} style={{ '--i': index } as CSSProperties}>
      <div className={styles.front} style={{ clipPath: clip.front }}>
        <div className={styles.writing}>
          <span>{name}</span>
        </div>
      </div>
      <div className={styles.back} style={{ clipPath: clip.back }} />
    </div>
  );
}

export const ParticipantSlip = memo(function ParticipantSlip({
  id,
  name,
  staggerMs,
  onRemove,
}: {
  id: string;
  name: string;
  staggerMs?: number;
  onRemove?: (id: string) => void;
}) {
  const [initialStagger] = useState(staggerMs);
  const [animating, setAnimating] = useState(initialStagger !== undefined);
  const { panels, vars } = useMemo(() => slipMotion(id, initialStagger ?? 0), [id, initialStagger]);
  return (
    <div className={`${styles.slip} ${animating ? styles.animating : ''}`} style={vars}>
      <div
        className={styles.paper}
        aria-hidden="true"
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setAnimating(false);
        }}
      >
        {animating ? (
          <>
            <div className={styles.stub} />
            <div className={styles.strip}>
              <Panel index={0} name={name} clip={panels[0]} />
              <div className={styles.hingeQuarter}>
                <Panel index={1} name={name} clip={panels[1]} />
              </div>
              <div className={styles.hingeHalf}>
                <div className={styles.hingeInner}>
                  <Panel index={2} name={name} clip={panels[2]} />
                </div>
                <Panel index={3} name={name} clip={panels[3]} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.under} style={{ clipPath: panels[0].front }} />
            <div
              className={`${styles.packet} ${styles.back}`}
              style={{ clipPath: panels[1].back }}
            />
          </>
        )}
      </div>
      <span className={styles.label}>{name}</span>
      {onRemove && (
        <button
          type="button"
          className={`icon-button remove ${styles.remove}`}
          aria-label={`Remover ${name}`}
          onClick={() => onRemove(id)}
        >
          <Icon name="close" />
        </button>
      )}
    </div>
  );
});
