'use client';
import { useState } from 'react';
import { useI18n } from './I18nContext';
import { HighlightBox } from './HighlightBox';
import type { BudgetKind, ExchangeDetails } from '@/lib/exchange-details';
import type { Locale } from '@/lib/i18n';

export const CURRENCIES = [
  'BRL',
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'MXN',
  'COP',
  'PHP',
  'JPY',
  'ARS',
  'CLP',
  'PEN',
  'UYU',
  'NZD',
  'CHF',
];

type Budget = Pick<ExchangeDetails, 'currency' | 'budget' | 'budgetMin' | 'budgetKind'>;

const symbolOf = (locale: Locale, currency: string) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency })
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value ?? currency;
const decimalOf = (locale: Locale) =>
  new Intl.NumberFormat(locale).formatToParts(1.5).find((part) => part.type === 'decimal')?.value ??
  '.';

/** "50,5" or "50.5" → "50.5"; anything else is not an amount yet. */
function parseAmount(text: string) {
  const trimmed = text.replace(/\s/g, '');
  if (!trimmed) return '';
  return /^\d{1,8}(?:[.,]\d{1,2})?$/.test(trimmed) ? trimmed.replace(',', '.') : null;
}

function AmountBox({
  value,
  onValue,
  label,
  locale,
  disabled,
  hint,
}: {
  hint: string;
  value: string;
  onValue: (value: string) => void;
  label: string;
  locale: Locale;
  disabled: boolean;
}) {
  const shown = value.replace('.', decimalOf(locale));
  const [draft, setDraft] = useState(shown);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    if (parseAmount(draft) !== value) setDraft(shown);
  }
  return (
    <input
      className="written-input budget-amount"
      inputMode="decimal"
      maxLength={11}
      autoComplete="off"
      aria-label={label}
      placeholder={hint}
      disabled={disabled}
      value={draft}
      style={{ width: `${Math.max(hint.length, draft.length) * 0.62 + 0.4}em` }}
      onChange={(event) => {
        const text = event.target.value.replace(/[^\d.,]/g, '');
        setDraft(text);
        const amount = parseAmount(text);
        if (amount !== null) {
          setSynced(amount);
          onValue(amount);
        }
      }}
    />
  );
}

/** The budget written as a sentence: "between R$ 50 and 70", "up to", "from", "about". */
export function BudgetSentence({
  value,
  onValue,
  disabled = false,
}: {
  value: Budget;
  onValue: (value: Budget) => void;
  disabled?: boolean;
}) {
  const { locale, t } = useI18n();
  const kind = value.budgetKind;
  const low = value.budgetMin ?? '',
    high = value.budget;
  const kinds: Record<BudgetKind, string> = {
    range: t('budget.kind.range', 'between'),
    max: t('budget.kind.max', 'up to'),
    min: t('budget.kind.min', 'from'),
    about: t('budget.kind.about', 'about'),
  };
  function change(next: Partial<Budget>) {
    onValue({ ...value, budgetKind: kind, ...next });
  }
  function switchKind(next: BudgetKind) {
    const one = high || low;
    const amounts: Record<BudgetKind, Pick<Budget, 'budget' | 'budgetMin'>> = {
      range: { budgetMin: low || one, budget: kind === 'range' ? high : '' },
      max: { budgetMin: '', budget: one },
      min: { budgetMin: one, budget: '' },
      about: { budgetMin: '', budget: one },
    };
    onValue({ ...value, budgetKind: next, ...amounts[next] });
  }
  const amount = (which: 'low' | 'high', label: string, hint: string) => (
    <AmountBox
      hint={hint}
      locale={locale}
      disabled={disabled}
      label={label}
      value={which === 'low' ? low : high}
      onValue={(text) => change(which === 'low' ? { budgetMin: text } : { budget: text })}
    />
  );
  return (
    <div className="notebook-field budget-field">
      <span className="budget-label-row">
        <label id="budget-label" htmlFor="budget-kind">
          {t('budget.label', 'Budget per gift')}
        </label>
        {(low || high) && (
          <button
            type="button"
            className="text-link budget-clear"
            disabled={disabled}
            onClick={() => onValue({ ...value, budgetMin: '', budget: '' })}
          >
            {t('budget.clear', 'Clear')}
          </button>
        )}
      </span>
      <HighlightBox className="budget-box">
        <fieldset className="budget-sentence" aria-labelledby="budget-label" disabled={disabled}>
          <select
            id="budget-kind"
            className="paper-select budget-kind"
            aria-label={t('budget.kindLabel', 'Kind of budget')}
            value={kind}
            onChange={(e) => switchKind(e.target.value as BudgetKind)}
          >
            {(Object.keys(kinds) as BudgetKind[]).map((option) => (
              <option key={option} value={option}>
                {kinds[option]}
              </option>
            ))}
          </select>
          <select
            className="paper-select budget-currency"
            aria-label={t('budget.currency', 'Currency')}
            value={value.currency}
            onChange={(e) => change({ currency: e.target.value })}
          >
            {[...new Set([value.currency, ...CURRENCIES])].filter(Boolean).map((code) => (
              <option key={code} value={code} title={code}>
                {symbolOf(locale, code)}
              </option>
            ))}
          </select>
          {kind === 'range' ? (
            <>
              {amount('low', t('budget.lowest', 'Lowest amount'), '50')}
              <span className="budget-word">{t('budget.and', 'and')}</span>
              {amount('high', t('budget.highest', 'Highest amount'), '70')}
            </>
          ) : kind === 'min' ? (
            amount('low', t('budget.amount', 'Amount'), '50')
          ) : (
            amount('high', t('budget.amount', 'Amount'), '50')
          )}
        </fieldset>
      </HighlightBox>
    </div>
  );
}
