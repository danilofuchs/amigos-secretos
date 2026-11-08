'use client';
import { useI18n } from '@/components/I18nContext';

export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return (
    <main id="main" className="page-shell empty-state">
      <h1>{t('error.couldntLoadPage', "Couldn't load this page.")}</h1>
      <p>
        {t(
          'error.weCouldntLoadExchanges',
          "We couldn't load the exchanges. Wait a moment and try again.",
        )}
      </p>
      <button className="button" onClick={reset}>
        {t('error.tryAgain', 'Try again')}{' '}
      </button>
    </main>
  );
}
