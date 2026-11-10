import { getI18n } from '@/lib/i18n/server';
import Link from 'next/link';
import { ownerId } from '@/lib/session';
import { listRaffles } from '@/lib/store';
import { Icon } from '@/components/Icon';
import { GoogleAccount } from '@/components/GoogleAccount';
import { accountEmail } from '@/lib/accounts';
export async function generateMetadata() {
  const { t } = await getI18n();
  return {
    title: t('raffles.myExchanges', 'My exchanges'),
    robots: { index: false, follow: false },
  };
}
export const dynamic = 'force-dynamic';

export default async function RafflesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { t } = await getI18n();
  const labels = {
    draft: t('raffles.draft', 'Draft'),
    drawn: t('raffles.namesDrawn', 'Names drawn'),
    archived: t('raffles.archived', 'Archived'),
  };
  const owner = await ownerId();
  const archived = (await searchParams).archived === '1';
  const [all, email] = owner
    ? await Promise.all([listRaffles(owner), accountEmail(owner)])
    : [[], null];
  const raffles = all.filter((r) => (r.status === 'archived') === archived);
  return (
    <main id="main" className="page-shell">
      <div className="page-heading">
        <div>
          <h1>{t('raffles.myExchanges', 'My exchanges')}</h1>
          <p>
            {t(
              'raffles.findSlipsUpdateDetails',
              'Find the slips or update the details for each group.',
            )}
          </p>
        </div>
        <div className="heading-actions">
          <Link href="/create" className="button">
            <Icon name="plus" />
            {t('raffles.newExchange', 'New exchange')}{' '}
          </Link>
          <GoogleAccount email={email} />
        </div>
      </div>
      <div className="tabs">
        <Link
          className={!archived ? 'selected' : ''}
          href="/sorteios"
          aria-current={!archived ? 'page' : undefined}
        >
          {t('raffles.current', 'Current')}{' '}
        </Link>
        <Link
          className={archived ? 'selected' : ''}
          href="/sorteios?archived=1"
          aria-current={archived ? 'page' : undefined}
        >
          {t('raffles.archived', 'Archived')}{' '}
        </Link>
      </div>
      {raffles.length ? (
        <ul className="raffle-list">
          {raffles.map((r) => (
            <li key={r.id} className="paper-shadow">
              <Link className="raffle-card torn-paper" href={`/sorteios/${r.id}`}>
                <div>
                  <span className={`badge ${r.status}`}>{labels[r.status]}</span>
                  <h2>{r.title}</h2>
                  <p>
                    {t(
                      'raffles.participantsExclusions',
                      '{count, plural, one {# participant} other {# participants}} · {exclusions, plural, =0 {no exclusions} one {# exclusion} other {# exclusions}}',
                      {
                        count: r.participants.length,
                        exclusions: r.exclusions.length,
                      },
                    )}
                  </p>
                </div>
                <span className="card-link">
                  {r.status === 'drawn'
                    ? t('raffles.detailsSlips', 'Details and slips')
                    : t('raffles.viewExchange', 'View exchange')}
                  <Icon name="arrow" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <section className="empty-state paper-shadow">
          <div className="empty-sheet torn-paper">
            <h2>
              {archived
                ? t('raffles.noArchivedExchanges', 'No archived exchanges.')
                : t('raffles.haventCreatedExchangeYet', "You haven't created an exchange yet.")}
            </h2>
            <p>
              {archived
                ? t('raffles.archivedExchangesWillAppear', 'Archived exchanges will appear here.')
                : t(
                    'raffles.startWithNamesEveryone',
                    'Start with the names of everyone taking part.',
                  )}
            </p>
            {!archived && (
              <Link href="/create" className="button">
                {t('raffles.createMyFirstExchange', 'Create my first exchange')}{' '}
                <Icon name="arrow" />
              </Link>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
