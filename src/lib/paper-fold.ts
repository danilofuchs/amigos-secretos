// Strip coordinate s spans 0..4 quarters; progress 0 is folded, 1 quarter-open, 2 open.

export const STRIP_ASPECT = 3.9;

export function stripWidthFor(sceneWidth: number) {
  return Math.max(160, Math.min(420, sceneWidth - 32));
}

export type FoldAngles = { quarter: number; half: number };

const PI = Math.PI;
const SPRING_LIFT = 0.08;
const OPEN_QUARTER = 0;
const OPEN_HALF = 0.045;
const CURL = 0.08;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function foldAngles(progress: number): FoldAngles {
  const quarterOpen = clamp(progress, 0, 1),
    halfOpen = clamp(progress - 1, 0, 1);
  return {
    quarter: mix(PI - SPRING_LIFT, OPEN_QUARTER, quarterOpen),
    half: mix(PI, OPEN_HALF, halfOpen),
  };
}

export function footprintCenter(progress: number) {
  return 0.5 + 0.5 * clamp(progress, 0, 1) + clamp(progress - 1, 0, 1);
}

function rotate(x: number, z: number, cx: number, cz: number, theta: number): [number, number] {
  const dx = x - cx,
    dz = z - cz,
    c = Math.cos(theta),
    s = Math.sin(theta);
  return [cx + dx * c - dz * s, cz + dx * s + dz * c];
}

function curl(distance: number, angle: number, quarter: number) {
  return CURL * Math.sin(angle) * (angle / PI) ** 2 * distance * distance * quarter;
}

// Hinges sit off the paper so each 180° turn lands one layer gap up; both folds open rightward.
export function stripPoint(
  s: number,
  angles: FoldAngles,
  quarter: number,
  gap: number,
  index = Math.min(3, Math.floor(s)),
): [number, number] {
  let x = s * quarter,
    z = 0;
  if (index >= 2)
    [x, z] = rotate(x, -curl(s - 2, angles.half, quarter), 2 * quarter, 0.5 * gap, angles.half);
  if (index === 1 || index === 2) {
    const distance = x / quarter - 1;
    [x, z] = rotate(
      x,
      z - curl(distance, angles.quarter, quarter),
      quarter,
      1.5 * gap,
      angles.quarter,
    );
  }
  return [x, z];
}
