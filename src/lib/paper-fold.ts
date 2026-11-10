// Strip coordinate s spans 0..4 quarters and v 0..1 bottom to top. Progress 2 is open, 1 quarter-open and
// 0 folded as received; below that the slip folds once more in half (-1), top over bottom (-2), and
// corner over corner (-3).

export const STRIP_ASPECT = 3.9;

export function stripWidthFor(sceneWidth: number) {
  return Math.max(160, Math.min(420, sceneWidth - 32));
}

export type FoldAngles = {
  quarter: number;
  half: number;
  eighth: number;
  vertical: number;
  diagonal: number;
};

/** The tightest the slip folds. */
export const FOLDED_MOST = -3;

const PI = Math.PI;
const SPRING_LIFT = 0.08;
const OPEN_QUARTER = 0;
const OPEN_HALF = 0.045;
const CURL = 0.08;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Each fold springs open slightly until the next one presses it flat, so every layer bends at the same line.
const pressed = (folded: number, next: number) => mix(0, mix(PI - SPRING_LIFT, PI, next), folded);

export function foldAngles(progress: number): FoldAngles {
  const quarterOpen = clamp(progress, 0, 1),
    halfOpen = clamp(progress - 1, 0, 1),
    eighth = clamp(-progress, 0, 1),
    vertical = clamp(-progress - 1, 0, 1),
    diagonal = clamp(-progress - 2, 0, 1);
  return {
    quarter: mix(mix(PI - SPRING_LIFT, PI, eighth), OPEN_QUARTER, quarterOpen),
    half: mix(PI, OPEN_HALF, halfOpen),
    eighth: pressed(eighth, vertical),
    vertical: pressed(vertical, diagonal),
    diagonal: pressed(diagonal, 0),
  };
}

/** Where the folded slip's middle sits, in quarters across and strip heights up from its own middle. */
export function footprintCenter(progress: number) {
  return (
    0.5 - 0.25 * clamp(-progress, 0, 1) + 0.5 * clamp(progress, 0, 1) + clamp(progress - 1, 0, 1)
  );
}
export function footprintMiddle(progress: number) {
  return -0.25 * clamp(-progress - 1, 0, 1);
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
  // Folded shut, quarters 0 and 2 lie face up and 1 and 3 face down, so their far halves alternate.
  const far = index % 2 === 0 ? s - index >= 0.5 : s - index <= 0.5;
  if (angles.eighth > 0 && far) [x, z] = rotate(x, z, 0.5 * quarter, 3.5 * gap, angles.eighth);
  return [x, z];
}

const FLAT: FoldAngles = { quarter: PI, half: PI, eighth: PI, vertical: 0, diagonal: 0 };
const EPSILON = 1e-6;

/** Where a point lands once the slip is folded down to its top-over-bottom square, as [x, y]. */
function squarePoint(s: number, v: number, quarter: number, height: number, index: number) {
  const [x] = stripPoint(s, FLAT, quarter, 0, index);
  return [x, -Math.abs(v - 0.5) * height] as const;
}

/** Which side of the corner fold a point of that square is on: positive for the corner that turns over. */
function cornerSide(x: number, y: number, quarter: number, height: number) {
  return ((quarter / 2) * y + (height / 2) * x) / (quarter * height);
}

/** Turns a point about the axis through `at` along unit direction `axis`, by `theta`. */
function turn(
  [px, py, pz]: [number, number, number],
  at: readonly [number, number, number],
  axis: readonly [number, number, number],
  theta: number,
): [number, number, number] {
  const [ux, uy, uz] = axis,
    x = px - at[0],
    y = py - at[1],
    z = pz - at[2];
  const c = Math.cos(theta),
    s = Math.sin(theta),
    dot = ux * x + uy * y + uz * z;
  return [
    at[0] + x * c + (uy * z - uz * y) * s + ux * dot * (1 - c),
    at[1] + y * c + (uz * x - ux * z) * s + uy * dot * (1 - c),
    at[2] + z * c + (ux * y - uy * x) * s + uz * dot * (1 - c),
  ];
}

/** A point of the strip in 3D, with every fold applied: x along the strip, y up it, z off the table. */
export function foldPoint(
  s: number,
  v: number,
  angles: FoldAngles,
  quarter: number,
  height: number,
  gap: number,
  index = Math.min(3, Math.floor(s)),
): [number, number, number] {
  const [x, z] = stripPoint(s, angles, quarter, gap, index);
  let point: [number, number, number] = [x, (v - 0.5) * height, z];
  // After the extra fold there are 8 layers, then 16: each hinge sits half a gap above the stack.
  if (angles.vertical > 0 && v >= 0.5) {
    const [y, z2] = rotate(point[1], point[2], 0, 7.5 * gap, angles.vertical);
    point = [point[0], y, z2];
  }
  if (angles.diagonal > 0) {
    const [sx, sy] = squarePoint(s, v, quarter, height, index);
    if (cornerSide(sx, sy, quarter, height) >= -EPSILON) {
      const length = Math.hypot(quarter / 2, height / 2);
      point = turn(
        point,
        [0, 0, 15.5 * gap],
        [quarter / 2 / length, -height / 2 / length, 0],
        angles.diagonal,
      );
    }
  }
  return point;
}

/** A crease as a straight line on the flat strip, from [s, v] to [s, v]. */
export type CreaseLine = readonly [number, number, number, number];

/** The lines a fold presses into the paper, by the stage it folds down to. */
export function creaseLines(stage: number): CreaseLine[] {
  if (stage === 1) return [[2, 0, 2, 1]];
  if (stage === 0)
    return [
      [1, 0, 1, 1],
      [3, 0, 3, 1],
    ];
  if (stage === -1) return [0.5, 1.5, 2.5, 3.5].map((at) => [at, 0, at, 1] as const);
  if (stage === -2) return [[0, 0.5, 4, 0.5]];
  if (stage !== FOLDED_MOST) return [];
  // In each eighth of each half, the corner fold runs along whichever diagonal lands on its axis.
  const lines: CreaseLine[] = [];
  for (let k = 0; k < 8; k++)
    for (const v0 of [0, 0.5]) {
      const s0 = k / 2,
        index = Math.floor(s0);
      const corners = [
        [s0, v0],
        [s0 + 0.5, v0],
        [s0, v0 + 0.5],
        [s0 + 0.5, v0 + 0.5],
      ] as const;
      const onAxis = corners.filter(([cs, cv]) => {
        const [x, y] = squarePoint(cs, cv, 1, 1, index);
        return Math.abs(cornerSide(x, y, 1, 1)) < 1e-6;
      });
      const [a, b] = onAxis;
      if (a && b) lines.push([a[0], a[1], b[0], b[1]]);
    }
  return lines;
}
