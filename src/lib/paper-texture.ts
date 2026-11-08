import { STRIP_ASPECT } from './paper-fold';

const TEX_W = 2048;
const TEX_H = Math.round(TEX_W / STRIP_ASPECT);
const INK = '#2146a0';
const INK_DEEP = '#173779';
const PAPER = '#fffefb';
const BASELINE = 0.7;
const RULE_GAP = 0.35;

export type NameLayout = { lines: string[]; fontSize: number; baselines: [number, ...number[]] };
export type StripFaces = { front: HTMLCanvasElement; back: HTMLCanvasElement; layout: NameLayout };

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(width = TEX_W, height = TEX_H) {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  return element;
}

function context(element: HTMLCanvasElement) {
  const ctx = element.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return ctx;
}

function tornOutline(seed: number): Path2D {
  const rand = random(seed);
  const points: [number, number][] = [];
  const edge = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    amplitude: number,
    step: number,
  ) => {
    const length = Math.hypot(bx - ax, by - ay),
      steps = Math.max(2, Math.round(length / step));
    const nx = (by - ay) / length,
      ny = -(bx - ax) / length;
    let drift = 0;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      drift = drift * 0.72 + (rand() - 0.5) * 0.9;
      const offset = i === 0 ? 0 : amplitude * (drift + (rand() - 0.5) * 0.5);
      points.push([ax + (bx - ax) * t + nx * offset, ay + (by - ay) * t + ny * offset]);
    }
  };
  const mx = 16,
    my = 14;
  edge(mx, my + 4, TEX_W - mx, my, 6, 13);
  edge(TEX_W - mx, my, TEX_W - mx - 6, TEX_H - my, 9, 11);
  edge(TEX_W - mx - 6, TEX_H - my, mx + 3, TEX_H - my - 3, 6, 13);
  edge(mx + 3, TEX_H - my - 3, mx, my + 4, 9, 11);
  const path = new Path2D();
  points.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
  path.closePath();
  return path;
}

function paperSide(ctx: CanvasRenderingContext2D, outline: Path2D, seed: number) {
  const rand = random(seed);
  ctx.save();
  ctx.clip(outline);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(122, 101, 66, ${0.018 + rand() * 0.035})`;
    ctx.fillRect(rand() * TEX_W, rand() * TEX_H, 1 + rand() * 1.6, 1 + rand() * 1.2);
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const x = rand() * TEX_W,
      y = rand() * TEX_H,
      length = 8 + rand() * 22,
      angle = rand() * Math.PI;
    ctx.strokeStyle = `rgba(150, 128, 92, ${0.04 + rand() * 0.04})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(angle) * length * 0.5 + rand() * 4,
      y + Math.sin(angle) * length * 0.5 + rand() * 4,
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length,
    );
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(122, 150, 204, .42)';
  ctx.lineWidth = 3;
  for (const y of [BASELINE, BASELINE - RULE_GAP]) {
    ctx.beginPath();
    ctx.moveTo(0, y * TEX_H);
    ctx.lineTo(TEX_W, y * TEX_H);
    ctx.stroke();
  }
  for (const k of [1, 2, 3]) {
    const x = (TEX_W * k) / 4;
    const crease = ctx.createLinearGradient(x - 9, 0, x + 9, 0);
    crease.addColorStop(0, 'rgba(110, 88, 56, 0)');
    crease.addColorStop(0.42, 'rgba(110, 88, 56, .085)');
    crease.addColorStop(0.55, 'rgba(255, 255, 255, .7)');
    crease.addColorStop(1, 'rgba(110, 88, 56, 0)');
    ctx.fillStyle = crease;
    ctx.fillRect(x - 9, 0, 18, TEX_H);
  }
  ctx.strokeStyle = 'rgba(206, 196, 175, .7)';
  ctx.lineWidth = 4;
  ctx.stroke(outline);
  ctx.restore();
}

export function layoutName(
  ctx: CanvasRenderingContext2D,
  name: string,
  family: string,
): NameLayout {
  const maxWidth = TEX_W * 0.84;
  const fit = (lines: string[], cap: number) => {
    ctx.font = `500 100px ${family}`;
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
    return Math.min(cap, (100 * maxWidth) / widest);
  };
  const single = fit([name], TEX_H * 0.74);
  const words = name.trim().split(/\s+/);
  if (single >= TEX_H * 0.4 || words.length < 2)
    return { lines: [name], fontSize: single, baselines: [BASELINE] };
  let best = [name, ''],
    bestSize = 0;
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const size = fit(lines, TEX_H * 0.4);
    if (size > bestSize) {
      best = lines;
      bestSize = size;
    }
  }
  return { lines: best, fontSize: bestSize, baselines: [BASELINE - RULE_GAP, BASELINE] };
}

function inkLayer(layout: NameLayout, family: string, seed: number) {
  const layer = canvas();
  const ctx = context(layer);
  const rand = random(seed);
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `500 ${layout.fontSize}px ${family}`;
  layout.lines.forEach((line, i) => {
    ctx.save();
    ctx.translate(TEX_W / 2, (layout.baselines[i] ?? layout.baselines[0]) * TEX_H - TEX_H * 0.035);
    ctx.rotate(-0.012 + rand() * 0.01);
    ctx.fillText(line, 0, 0);
    ctx.restore();
  });
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 5; i++) {
    const x = rand() * TEX_W,
      y = rand() * TEX_H,
      r = 120 + rand() * 260;
    const pool = ctx.createRadialGradient(x, y, 0, x, y, r);
    pool.addColorStop(0, i % 2 ? 'rgba(255, 255, 255, .13)' : INK_DEEP);
    pool.addColorStop(1, 'rgba(33, 70, 160, 0)');
    ctx.globalAlpha = i % 2 ? 1 : 0.35;
    ctx.fillStyle = pool;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.06 + rand() * 0.2})`;
    ctx.fillRect(rand() * TEX_W, rand() * TEX_H, 1.5 + rand() * 4, 0.8 + rand() * 1.2);
  }
  return layer;
}

export function drawStripFaces(name: string, family: string): StripFaces {
  const front = canvas(),
    back = canvas();
  const frontCtx = context(front),
    backCtx = context(back);
  const layout = layoutName(frontCtx, name, family);
  const outline = tornOutline(9);
  const ink = inkLayer(layout, family, 4);
  paperSide(frontCtx, outline, 21);
  frontCtx.save();
  frontCtx.clip(outline);
  frontCtx.drawImage(ink, 0, 0);
  frontCtx.restore();
  paperSide(backCtx, outline, 33);
  // Bleed-through is drawn unmirrored: seeing the back face from behind mirrors it.
  backCtx.save();
  backCtx.clip(outline);
  for (const [dx, dy] of [
    [0, 0],
    [2, 1],
    [-2, 1],
    [1, -2],
    [-1, -1],
  ] as const) {
    backCtx.globalAlpha = 0.013;
    backCtx.drawImage(ink, dx, dy);
  }
  backCtx.restore();
  return { front, back, layout: { ...layout, fontSize: layout.fontSize / TEX_W } };
}
