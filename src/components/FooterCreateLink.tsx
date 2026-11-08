'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from './I18nContext';
import { Icon } from './Icon';

/** Points to a new raffle: hidden while creating one, "another" while managing one. */
export function FooterCreateLink() {
  const { t } = useI18n();
  const path = usePathname();
  if (path === '/create') return <span />;
  return (
    <Link href="/create">
      {path.startsWith('/sorteios')
        ? t('footerCreateLink.organizeAnotherExchange', 'Organize another exchange')
        : t('footerCreateLink.organizeExchange', 'Organize your exchange')}{' '}
      <Icon name="arrow" />
    </Link>
  );
}
