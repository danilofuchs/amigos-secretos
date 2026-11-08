'use client';
import { formatBudget } from '@/lib/i18n';
import type { ExchangeDetails } from '@/lib/raffle';
import { useI18n } from '@/components/I18nContext';
export function HiddenRules({ rules, details }: { rules: string; details?: ExchangeDetails }) {
  const { t, locale } = useI18n();
  return (
    <section className="rules paper-shadow">
      <div className="rules-sheet torn-paper">
        <h2>{t('hiddenRules.whatWeAgreed', 'What we agreed')}</h2>
        {details && (
          <dl className="exchange-summary">
            {details.occasion && (
              <>
                <dt>{t('hiddenRules.occasion', 'Occasion')}</dt>
                <dd>{details.occasion}</dd>
              </>
            )}
            {details.date && (
              <>
                <dt>{t('hiddenRules.exchangeDate', 'Exchange date')}</dt>
                <dd>
                  {new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
                    new Date(`${details.date}T12:00:00Z`),
                  )}
                </dd>
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
