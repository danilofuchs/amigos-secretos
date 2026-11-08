import assert from 'node:assert/strict';
import { test } from 'vitest';
import { foldAngles, footprintCenter, stripPoint } from './paper-fold.ts';

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
