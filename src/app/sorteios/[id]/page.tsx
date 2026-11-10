import { getI18n } from '@/lib/i18n/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ownerId } from '@/lib/session';
import { getRaffle, getTicketOpens } from '@/lib/store';
import { RaffleForm } from '@/components/RaffleForm';
import { Icon } from '@/components/Icon';
import { ShareTickets } from '@/components/ShareTickets';
import { sentCookie } from '@/lib/sent-cookie';
import { cookies } from 'next/headers';
export async function generateMetadata() {
  const { t } = await getI18n();
  return {
    title: t('raffle.manageExchange', 'Manage exchange'),
    robots: { index: false, follow: false },
  };
}
export default async function ManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { t, currency } = await getI18n();
  const owner = await ownerId();
  if (!owner) notFound();
  const raffle = await getRaffle((await params).id, owner);
  if (!raffle) notFound();
  const opens = raffle.status === 'drawn' ? await getTicketOpens(raffle.id, owner) : {};
  return (
    <main id="main" className="page-shell">
      <Link href="/sorteios" className="back-link">
        <Icon name="back" />
        {t('raffle.myExchanges', 'My exchanges')}{' '}
      </Link>
      <div className="page-heading">
        <h1>{raffle.title}</h1>
        <span className={`badge ${raffle.status}`}>
          {raffle.status === 'draft'
            ? t('raffle.draft', 'Draft')
            : raffle.status === 'drawn'
              ? t('raffle.namesDrawn', 'Names drawn')
              : t('raffle.archived', 'Archived')}
        </span>
      </div>
      {raffle.status === 'drawn' && (
        <ShareTickets
          key={raffle.drawId ?? ''}
          raffleId={raffle.id}
          title={raffle.title}
          tickets={raffle.tickets}
          opens={opens}
          initialSent={(await cookies()).get(sentCookie(raffle.id))?.value ?? ''}
        />
      )}
      <RaffleForm
        key={`${raffle.id}:${raffle.status}`}
        raffle={raffle}
        defaultCurrency={currency}
        canRedraw={raffle.status === 'drawn' && Object.keys(opens).length === 0}
        openedBy={raffle.tickets
          .filter((ticket) => opens[ticket.code])
          .sort((a, b) => (opens[a.code] ?? '').localeCompare(opens[b.code] ?? ''))
          .map((ticket) => ticket.name)}
      />
    </main>
  );
}
