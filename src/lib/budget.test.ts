import { expect, test } from 'vitest';
import { budgetIsValid, emptyDetails, isPastDay, normalizeBudget } from './exchange-details';
import { formatBudget } from './i18n';

const budget = (patch: Partial<typeof emptyDetails>) => ({
  ...emptyDetails,
  currency: 'BRL',
  ...patch,
});

test('each kind of budget reads naturally in every language', () => {
  expect(
    formatBudget('pt-BR', budget({ budgetKind: 'range', budgetMin: '50', budget: '70' })),
  ).toMatch(/R\$\s?50,00\s?–\s?R?\$?\s?70,00/);
  expect(formatBudget('pt-BR', budget({ budgetKind: 'max', budget: '70' }))).toMatch(
    /^até R\$\s?70,00$/,
  );
  expect(formatBudget('en', budget({ budgetKind: 'min', budgetMin: '50', currency: 'USD' }))).toBe(
    '$50.00 or more',
  );
  expect(
    formatBudget('es', budget({ budgetKind: 'about', budget: '50', currency: 'EUR' })),
  ).toMatch(/^alrededor de 50,00\s?€$/);
  expect(formatBudget('en', budget({}))).toBe('');
});

test('a half-filled budget is rejected; an empty one is fine', () => {
  expect(budgetIsValid(budget({}))).toBe(true);
  expect(budgetIsValid(budget({ budgetKind: 'range', budgetMin: '50', budget: '' }))).toBe(false);
  expect(budgetIsValid(budget({ budgetKind: 'range', budgetMin: '80', budget: '70' }))).toBe(true);
  expect(budgetIsValid(budget({ budgetKind: 'min', budgetMin: '50' }))).toBe(true);
  expect(budgetIsValid(budget({ budgetKind: 'max', budget: '70.5' }))).toBe(true);
  expect(budgetIsValid(budget({ budgetKind: 'about', budget: '1,5' }))).toBe(false);
  expect(budgetIsValid(budget({ budgetKind: 'about', budget: '50', currency: '' }))).toBe(false);
});

test('a range reads in either order, and a range of one amount becomes "about"', () => {
  expect(normalizeBudget(budget({ budgetKind: 'range', budgetMin: '80', budget: '70' }))).toEqual(
    budget({ budgetKind: 'range', budgetMin: '70', budget: '80' }),
  );
  const same = normalizeBudget(budget({ budgetKind: 'range', budgetMin: '50', budget: '50.00' }));
  expect(same.budgetKind).toBe('about');
  expect(same.budget).toBe('50.00');
  expect('budgetMin' in same).toBe(false);
  const typing = budget({ budgetKind: 'range', budgetMin: '80', budget: '' });
  expect(normalizeBudget(typing)).toBe(typing);
});

test('the meeting day may be today but not earlier', () => {
  expect(isPastDay('2026-11-07', '2026-11-08')).toBe(true);
  expect(isPastDay('2026-11-08', '2026-11-08')).toBe(false);
  expect(isPastDay('', '2026-11-08')).toBe(false);
});
