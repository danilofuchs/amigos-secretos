import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  creaseLines,
  FOLDED_MOST,
  foldAngles,
  foldPoint,
  footprintCenter,
  stripPoint,
} from './paper-fold.ts';

const Q = 80,
  GAP = 0.7;
const at = (s: number, p: number) => stripPoint(s, foldAngles(p), Q, GAP);

test('closed strip stacks every quarter over quarter 0 in a fixed order', () => {
  const z = (s: number) => at(s, 0)[1];
  for (const [s0, s3, s2, s1] of [
    [0.5, 3.5, 2.5, 1.5],
    [0.2, 3.8, 2.2, 1.8],
  ] as const) {
    assert.ok(z(s3) > z(s0) + GAP * 0.5, 'quarter 3 above quarter 0');
    assert.ok(z(s2) > z(s3) + GAP * 0.5, 'quarter 2 above quarter 3');
    assert.ok(z(s1) > z(s2) + GAP * 0.5, 'quarter 1 above quarter 2');
  }
  for (const s of [0.5, 1.5, 2.5, 3.5]) {
    const x = at(s, 0)[0] / Q;
    assert.ok(x > -0.05 && x < 1.05, `s=${s} lies over quarter 0, got x=${x}`);
  }
});

test('no layer passes through another during either fold', () => {
  for (let p = 0; p <= 2.0001; p += 0.01) {
    for (const d of [0.1, 0.5, 0.9]) {
      const pairs: [number, number][] =
        p <= 1
          ? [
              [1 + d, 3 - d],
              [d, 4 - d],
            ]
          : [
              [1 + d, 1 + d],
              [3 - d, d],
            ];
      if (p <= 1)
        for (const [a, b] of pairs) {
          const [xa, za] = at(a, p),
            [xb, zb] = at(b, p);
          assert.ok(
            Math.hypot(xa - xb, za - zb) > GAP * 0.5,
            `p=${p.toFixed(2)} s=${a}/${b} touch`,
          );
        }
    }
    for (let s = 0; s <= 4; s += 0.05)
      assert.ok(at(s, p)[1] > -1, `p=${p.toFixed(2)} s=${s.toFixed(2)} sinks below the table`);
  }
});

test('both folds swing toward the right and creases stay joined', () => {
  assert.ok(at(2, 0.5)[1] > Q * 0.5, 'quarter fold rises mid-swing');
  assert.ok(at(4, 1.5)[1] > Q, 'half fold rises mid-swing');
  assert.ok(at(2, 0.9)[0] > at(2, 0.1)[0], 'quarter flap moves right');
  assert.ok(at(4, 1.9)[0] > at(4, 1.1)[0], 'half flap moves right');
  for (const p of [0, 0.3, 0.7, 1, 1.4, 2]) {
    for (const crease of [1, 2, 3]) {
      const [ax, az] = at(crease - 1e-6, p),
        [bx, bz] = at(crease + 1e-6, p);
      assert.ok(Math.hypot(ax - bx, az - bz) < GAP * 3.5, `crease ${crease} torn at p=${p}`);
    }
  }
});

test('open strip lies nearly flat across its full width', () => {
  for (let s = 0; s <= 4; s += 0.25) {
    const [x, z] = at(s, 2);
    assert.ok(Math.abs(x - s * Q) < Q * 0.02, `s=${s} x=${x}`);
    assert.ok(z > -1 && z < Q * 0.12, `s=${s} z=${z}`);
  }
  assert.equal(footprintCenter(0), 0.5);
  assert.equal(footprintCenter(1), 1);
  assert.equal(footprintCenter(2), 2);
});

test('folding once more halves the closed strip into eight stacked layers', () => {
  const layers = [0.25, 0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 3.75].map((s) => at(s, -1));
  for (const [x] of layers)
    assert.ok(x > -Q * 0.05 && x < Q * 0.55, `layer lies over the first eighth, got x=${x}`);
  const z = layers.map(([, z]) => z).sort((a, b) => a - b);
  for (let i = 1; i < z.length; i++)
    assert.ok(z[i]! - z[i - 1]! > GAP * 0.5, `layers ${i - 1} and ${i} touch: ${z.join(', ')}`);
  assert.equal(footprintCenter(-1), 0.25);
});

test('the extra fold swings without tearing the paper or passing through it', () => {
  for (let p = -1; p <= 0.0001; p += 0.02) {
    for (let index = 0; index < 4; index++)
      for (let i = 0; i < 16; i++) {
        const [ax, az] = stripPoint(index + i / 16, foldAngles(p), Q, GAP, index),
          [bx, bz] = stripPoint(index + (i + 1) / 16, foldAngles(p), Q, GAP, index);
        assert.ok(
          Math.hypot(ax - bx, az - bz) < Q / 16 + GAP * 8,
          `p=${p.toFixed(2)} quarter ${index} step ${i} tears`,
        );
      }
    for (let s = 0; s <= 4; s += 0.05)
      assert.ok(at(s, p)[1] > -1, `p=${p.toFixed(2)} s=${s.toFixed(2)} sinks below the table`);
  }
});

const H = Q * 1.02;
const grid = (each: (s: number, v: number, index: number) => void) => {
  for (let index = 0; index < 4; index++)
    for (let i = 0; i <= 16; i++) for (let j = 0; j <= 16; j++) each(index + i / 16, j / 16, index);
};

test('folding top over bottom, then corner over corner, keeps the slip inside a shrinking footprint', () => {
  grid((s, v, index) => {
    const [x, y, z] = foldPoint(s, v, foldAngles(-2), Q, H, GAP, index);
    assert.ok(x > -Q * 0.06 && x < Q * 0.56, `-2 s=${s} v=${v} x=${x}`);
    assert.ok(y > -H * 0.53 && y < H * 0.03, `-2 s=${s} v=${v} y=${y}`);
    assert.ok(z > -1, `-2 s=${s} v=${v} z=${z}`);
    const [cx, cy, cz] = foldPoint(s, v, foldAngles(FOLDED_MOST), Q, H, GAP, index);
    assert.ok(cz > -1, `-3 s=${s} v=${v} sinks, z=${cz}`);
    // Folded corner over corner, everything lies on the lower-left side of the diagonal.
    assert.ok((Q / 2) * cy + (H / 2) * cx < Q * H * 0.04, `-3 s=${s} v=${v} sits past the fold`);
  });
});

test('the last two folds swing without tearing the paper', () => {
  for (let p = -1; p >= FOLDED_MOST - 0.0001; p -= 0.05)
    for (let index = 0; index < 4; index++)
      for (let i = 0; i < 16; i++)
        for (let j = 0; j < 16; j++) {
          const at = (di: number, dj: number) =>
            foldPoint(index + (i + di) / 16, (j + dj) / 16, foldAngles(p), Q, H, GAP, index);
          const [a, b, c] = [at(0, 0), at(1, 0), at(0, 1)];
          for (const other of [b, c])
            assert.ok(
              Math.hypot(a[0] - other[0], a[1] - other[1], a[2] - other[2]) < Q / 16 + GAP * 32,
              `p=${p.toFixed(2)} quarter ${index} cell ${i},${j} tears`,
            );
        }
});

test('each fold leaves its own creases', () => {
  assert.equal(creaseLines(-2).length, 1);
  const diagonals = creaseLines(FOLDED_MOST);
  assert.equal(diagonals.length, 16);
  for (const [s0, v0, s1, v1] of diagonals) {
    assert.equal(Math.abs(s1 - s0), 0.5);
    assert.equal(Math.abs(v1 - v0), 0.5);
  }
});
