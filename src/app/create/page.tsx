import { getI18n } from '@/lib/i18n/server';
import { RaffleForm } from '@/components/RaffleForm';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('create.createExchange', 'Create an exchange') };
}
export default async function CreatePage() {
  const { t, currency } = await getI18n();
  return (
    <main id="main" className="page-shell create-page">
      <Link href="/sorteios" className="back-link">
        <Icon name="back" />
        {t('create.myExchanges', 'My exchanges')}{' '}
      </Link>
      <div className="page-intro">
        <h1>{t('create.shallWeDrawNames', 'Shall we draw names?')}</h1>
        <p>
          {t(
            'create.addParticipantsAgreeDetails',
            'Add the participants and agree on the details.',
          )}
        </p>
      </div>
      <RaffleForm defaultCurrency={currency} />
    </main>
  );
}
