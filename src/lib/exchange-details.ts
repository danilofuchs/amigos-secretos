/** How a gift price is stated: a range, a ceiling, a floor or a rough reference. */
export const budgetKinds = ['range', 'max', 'min', 'about'] as const;
export type BudgetKind = (typeof budgetKinds)[number];
export type ExchangeDetails = {
  occasion: string;
  date: string;
  currency: string;
  /** Upper amount (or the only amount for "up to" and "about"). */
  budget: string;
  /** Lower amount, for a range or "from". */
  budgetMin?: string;
  budgetKind: BudgetKind;
  theme: string;
};
export const emptyDetails: ExchangeDetails = {
  occasion: '',
  date: '',
  currency: '',
  budget: '',
  budgetKind: 'range',
  theme: '',
};

const AMOUNT = /^\d{1,8}(?:\.\d{1,2})?$/;
/**
 * A range reads the same in either order, and a range of one amount is really "about" it.
 * Anything not yet a pair of amounts is left alone.
 */
export function normalizeBudget(details: ExchangeDetails): ExchangeDetails {
  const low = details.budgetMin ?? '',
    high = details.budget;
  if (details.budgetKind !== 'range' || !AMOUNT.test(low) || !AMOUNT.test(high)) return details;
  if (Number(low) === Number(high)) {
    const { budgetMin: _, ...rest } = details;
    return { ...rest, budgetKind: 'about', budget: high };
  }
  return Number(low) > Number(high) ? { ...details, budgetMin: high, budget: low } : details;
}

/** Each kind needs its own amounts; an empty budget is fine, a half-filled one is not. */
export function budgetIsValid(raw: ExchangeDetails) {
  const details = normalizeBudget(raw);
  const low = details.budgetMin ?? '',
    high = details.budget;
  if (!low && !high) return true;
  if (!details.currency || (low && !AMOUNT.test(low)) || (high && !AMOUNT.test(high))) return false;
  switch (details.budgetKind) {
    case 'range':
      return !!low && !!high;
    case 'min':
      return !!low && !high;
    case 'max':
    case 'about':
      return !!high && (!low || low === high);
  }
}

/** Whether an ISO day is before `today` (also ISO); the same day still counts as upcoming. */
export const isPastDay = (date: string, today: string) => !!date && date < today;
