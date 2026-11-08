import { expect, test } from 'vitest';
import { checkDraw, toRaffleInput } from './agent-input';
import { validateInput } from './raffle';

const ids = () => {
  let next = 0;
  return () => `p${next++}`;
};

test('names, one-way rules and groups become the form input the server validates', () => {
  const input = toRaffleInput(
    {
      names: ['Ana', 'Bruno', 'Carla', 'Diego'],
      exclusions: [{ giver: 'ana', cannotDraw: 'Diego' }],
      groups: [['Bruno', 'Carla']],
      occasion: 'Natal da família',
      date: '2099-12-24',
      time: '19:30',
      budget: { kind: 'range', currency: 'BRL', min: 80, max: 50 },
    },
    ids(),
  );
  if ('unknownName' in input) throw new Error(input.unknownName);
  expect(input.title).toBe('Natal da família');
  expect(input.exclusions).toEqual([
    { from: 'p0', to: 'p3' },
    { from: 'p1', to: 'p2' },
    { from: 'p2', to: 'p1' },
  ]);
  expect(validateInput(input).details).toMatchObject({
    budgetMin: '50',
    budget: '80',
    time: '19:30',
  });
});

test('a rule naming someone off the list is reported, not dropped', () => {
  expect(toRaffleInput({ names: ['Ana', 'Bruno'], groups: [['Ana', 'Zé']] }, ids())).toEqual({
    unknownName: 'Zé',
  });
});

test('an impossible draw says who would be left out', () => {
  expect(checkDraw({ names: ['Ana', 'Bruno', 'Carla'] })).toEqual({ possible: true });
  const stuck = checkDraw({
    names: ['Ana', 'Bruno', 'Carla'],
    groups: [['Ana', 'Bruno', 'Carla']],
  });
  expect(stuck.possible).toBe(false);
  expect(stuck.givers?.length).toBeGreaterThan(0);
});
