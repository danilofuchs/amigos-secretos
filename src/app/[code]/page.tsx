import { getI18n } from '@/lib/i18n/server';
import { normalizeTicketCode } from '@/lib/codes';
import { HiddenName } from '@/components/HiddenName';
import { HiddenRules } from '@/components/HiddenRules';
import { getTicket } from '@/lib/store';
import Link from 'next/link';
import { markOpened } from './actions';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const { t } = await getI18n();
  return {
    title: t('ticket.secretSlip', 'Your secret slip'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { t } = await getI18n();
  const code = normalizeTicketCode((await params).code);
  const ticket = code ? await getTicket(code) : null;
  if (!ticket)
    return (
      <main id="main" className="page-shell empty-state">
        <h1>{t('ticket.weCouldntFindSlip', "We couldn't find this slip.")}</h1>
        <p>
          {t(
            'ticket.checkCodeAskOrganizer',
            'Check the code or ask the organizer for a new link. The exchange may also have been archived.',
          )}{' '}
        </p>
        <Link href="/" className="button">
          {t('ticket.backHome', 'Back to home')}{' '}
        </Link>
      </main>
    );
  return (
    <main id="main" className="reveal-page">
      <h1>{ticket.title}</h1>
      <HiddenName name={ticket.name} openAction={markOpened.bind(null, code!, ticket.drawId)} />
      <HiddenRules details={ticket.details} rules={ticket.rules} />
      <p className="hint">
        {t(
          'ticket.keepLinkPrivateAnyone',
          'Keep this link private. Anyone with it can see your recipient.',
        )}{' '}
      </p>
    </main>
  );
}
