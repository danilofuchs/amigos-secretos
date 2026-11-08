import { expect, test } from 'vitest';
import { matchParticipants } from './matching';

const people = (...ids: string[]) => ids.map((id) => ({ id }));
const apart = (...ids: string[]) =>
  ids.flatMap((from) => ids.filter((to) => to !== from).map((to) => ({ from, to })));

test('finds a draw that respects every exclusion', () => {
  const group = people('a', 'b', 'c', 'd', 'e', 'f');
  const exclusions = apart('a', 'b', 'c');
  const result = matchParticipants(group, exclusions);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  for (const { id } of group) {
    const to = result.recipientOf.get(id)!;
    expect(to).not.toBe(id);
    expect(exclusions.some((e) => e.from === id && e.to === to)).toBe(false);
  }
});

test('names the group that has too few people left to draw', () => {
  // Four people kept apart among five: all four can only draw "e".
  const result = matchParticipants(people('a', 'b', 'c', 'd', 'e'), apart('a', 'b', 'c', 'd'));
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.recipients).toEqual(['e']);
  expect(result.givers.toSorted()).toEqual(['a', 'b', 'c', 'd']);
});

test('a group can be kept apart when there are enough others', () => {
  expect(
    matchParticipants(people('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'), apart('a', 'b', 'c', 'd')).ok,
  ).toBe(true);
});
