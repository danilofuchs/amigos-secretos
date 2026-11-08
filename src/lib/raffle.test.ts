import { test } from 'vitest';
import assert from 'node:assert/strict';
import { draw, validateInput, ValidationError } from './raffle.ts';
const people = ['Ana', 'Bruno', 'Carla', 'Davi'].map((name, i) => ({ id: String(i), name }));
test('every participant gives and receives once, without self matches', () => {
  for (let size = 2; size <= 100; size++) {
    const participants = Array.from({ length: size }, (_, i) => ({
      id: String(i),
      name: `Pessoa ${i}`,
    }));
    for (let trial = 0; trial < 10; trial++) {
      const pairs = draw(participants, []);
      assert.equal(pairs.size, size);
      assert.equal(new Set(pairs.values()).size, size);
      for (const [from, to] of pairs) assert.notEqual(from, to);
    }
  }
});
test('respects directional exclusions without blocking their reverse', () => {
  const pairs = draw(people.slice(0, 3), [{ from: '0', to: '1' }]);
  assert.equal(pairs.get('0'), '2');
  assert.equal(pairs.get('1'), '0');
});
test('finds a valid result for every feasible exclusion graph with four people', () => {
  const edges = people.flatMap((p) =>
    people.filter((q) => q.id !== p.id).map((q) => ({ from: p.id, to: q.id })),
  );
  function feasible(blocked: Set<string>, at = 0, taken = new Set<string>()): boolean {
    const giver = people[at];
    if (!giver) return true;
    return people.some((p) => {
      if (p.id === giver.id || taken.has(p.id) || blocked.has(`${giver.id}:${p.id}`)) return false;
      return feasible(blocked, at + 1, new Set([...taken, p.id]));
    });
  }
  for (let mask = 0; mask < 2 ** edges.length; mask++) {
    const exclusions = edges.filter((_, i) => mask & (1 << i));
    const blocked = new Set(exclusions.map((e) => `${e.from}:${e.to}`));
    if (!feasible(blocked)) assert.throws(() => draw(people, exclusions), ValidationError);
    else {
      const pairs = draw(people, exclusions);
      assert.equal(pairs.size, 4);
      for (const [a, b] of pairs) assert.ok(!blocked.has(`${a}:${b}`));
    }
  }
});
test('rejects normalized duplicate names and invalid exclusions', () => {
  const input = { title: 'Turma', rules: 'R$ 50', participants: people, exclusions: [] };
  assert.equal(validateInput(input).title, 'Turma');
  assert.equal(validateInput({ ...input, title: '  ' }).title, 'Amigo secreto');
  assert.throws(
    () =>
      validateInput({
        ...input,
        participants: [
          { id: '1', name: 'Ana' },
          { id: '2', name: ' ana ' },
        ],
      }),
    ValidationError,
  );
  assert.throws(
    () => validateInput({ ...input, exclusions: [{ from: '0', to: 'missing' }] }),
    ValidationError,
  );
});
