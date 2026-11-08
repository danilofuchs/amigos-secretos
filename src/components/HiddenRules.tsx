'use client';
import { formatBudget } from '@/lib/i18n';
import type { ExchangeDetails } from '@/lib/raffle';
import { useI18n } from '@/components/I18nContext';
/** The meeting day and time in the reader's language; either part may be missing. */
function formatWhen(locale: string, date: string, time: string) {
  const at = new Date(`${date || '2000-01-01'}T${time || '12:00'}:00Z`);
  return new Intl.DateTimeFormat(locale, {
    ...(date ? { dateStyle: 'long' } : {}),
    ...(time ? { timeStyle: 'short' } : {}),
    timeZone: 'UTC',
  }).format(at);
}

export function HiddenRules({ rules, details }: { rules: string; details?: ExchangeDetails }) {
  const { t, locale } = useI18n();
  return (
    <section className="rules paper-shadow">
      <div className="rules-sheet torn-paper">
        <h2>{t('hiddenRules.whatWeAgreed', 'What we agreed')}</h2>
        {details && (
          <dl className="exchange-summary">
            {(details.date || details.time) && (
              <>
                <dt>{t('hiddenRules.exchangeDate', 'Exchange date')}</dt>
                <dd>{formatWhen(locale, details.date, details.time)}</dd>
              </>
            )}
            {details.location && (
              <>
                <dt>{t('hiddenRules.location', 'Location')}</dt>
                <dd>{details.location}</dd>
              </>
            )}
            {formatBudget(locale, details) && (
              <>
                <dt>{t('hiddenRules.budgetPerGift', 'Budget per gift')}</dt>
                <dd>{formatBudget(locale, details)}</dd>
              </>
            )}
            {details.theme && (
              <>
                <dt>{t('hiddenRules.giftTheme', 'Gift theme')}</dt>
                <dd>{details.theme}</dd>
              </>
            )}
          </dl>
        )}
        <p className="preserve-lines handwritten">
          {rules ||
            t(
              'hiddenRules.organizerHasntAddedDetails',
              "The organizer hasn't added the details yet.",
            )}
        </p>
        <p className="hint">
          {t(
            'hiddenRules.organizerCanUpdateThese',
            'The organizer can update these details. Check again before the exchange.',
          )}{' '}
        </p>
      </div>
    </section>
  );
}
