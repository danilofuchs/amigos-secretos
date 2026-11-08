import { getI18n } from '@/lib/i18n/server';
import Link from 'next/link';
export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main id="main" className="page-shell empty-state">
      <h1>{t('notFound.weCouldntFindPage', "We couldn't find this page.")}</h1>
      <p>
        {t(
          'notFound.pageDoesntExistBrowser',
          "This page doesn't exist, or this browser cannot access the exchange.",
        )}
      </p>
      <Link className="button" href="/sorteios">
        {t('notFound.myExchanges', 'My exchanges')}{' '}
      </Link>
    </main>
  );
}
