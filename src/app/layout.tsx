import { getI18n } from '@/lib/i18n/server';
import { I18nProvider, LanguagePicker } from '@/components/I18nProvider';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Link from 'next/link';
import { InkFilter } from '@/components/InkFilter';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/Icon';
import { HideWhileCreating } from '@/components/HideWhileCreating';
import { AgentTools } from '@/components/AgentTools';
import { FooterCreateLink } from '@/components/FooterCreateLink';
import './globals.css';
const handwriting = localFont({
  src: '../../public/fonts/caveat.ttf',
  variable: '--font-handwriting',
  weight: '400 700',
  display: 'swap',
});
const ui = localFont({
  src: '../../public/fonts/public-sans.ttf',
  variable: '--font-ui',
  weight: '100 900',
  display: 'swap',
});
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: {
      default: t(
        'layout.amigosSecretosDrawNames',
        'Amigos Secretos | Draw names and send secret slips',
      ),
      template: '%s · Amigos Secretos',
    },
    description: t(
      'layout.writeNamesAgreeRules',
      'Write the names, agree on the rules and send everyone a secret slip.',
    ),
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://amigossecretos.vercel.app'),
    icons: { icon: '/icon.svg', apple: '/icon.svg' },
  };
}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();
  return (
    <html lang={locale} className={`${handwriting.variable} ${ui.variable}`}>
      <body>
        <I18nProvider locale={locale}>
          <InkFilter />
          <AgentTools />
          <a className="skip-link" href="#main">
            {t('layout.skipContent', 'Skip to content')}
          </a>
          <header className="site-header">
            <Logo />
            <nav aria-label={t('layout.mainMenu', 'Main menu')}>
              <Link href="/sorteios">{t('layout.myExchanges', 'My exchanges')}</Link>
              <HideWhileCreating>
                <Link className="button nav-create" href="/create">
                  <Icon name="plus" />
                  <span className="nav-create-full">
                    {t('layout.createExchange', 'Create an exchange')}
                  </span>
                  <span className="nav-create-short">{t('layout.create', 'Create')}</span>
                </Link>
              </HideWhileCreating>
            </nav>
          </header>
          {children}
          <footer className="site-footer">
            <p>Amigos Secretos</p>
            <LanguagePicker />
            <FooterCreateLink />
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
