import { getI18n } from '@/lib/i18n/server';
import { isLocale, translator } from '@/lib/i18n';
import { normalizeTicketCode } from '@/lib/codes';
import { HiddenName } from '@/components/HiddenName';
import { HiddenRules } from '@/components/HiddenRules';
import { getTicket } from '@/lib/store';
import Link from 'next/link';
import { markOpened } from './actions';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  // Link previews are fetched by the messaging app, not the participant: follow the message's language.
  const { lang } = await searchParams;
  const t = isLocale(lang) ? translator(lang) : (await getI18n()).t;
  const title = t('ticket.secretSlip', 'Your secret slip');
  const description = t('ticket.previewDescription', 'Open it to see whose name you drew.');
  return {
    title,
    description,
    openGraph: { title, description, images: ['/opengraph-image'] },
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
