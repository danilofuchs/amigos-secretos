'use client';
import { useI18n } from '@/components/I18nContext';
import Link from 'next/link';
export function Logo() {
  const { t } = useI18n();
  return (
    <Link
      href="/"
      className="brand"
      aria-label={t('logo.amigosSecretosHome', 'Amigos Secretos — home')}
    >
      <svg className="brand-mark" viewBox="0 0 38 44" fill="none" aria-hidden="true">
        <path d="m6 6 22-3 5 32-23 4L6 6Z" fill="var(--paper)" />
        <path
          d="m6 6 22-3 5 32-23 4L6 6Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="m8 14 22-3M9 22l22-3m-21 9 22-3M16 7l4 29"
          stroke="currentColor"
          strokeWidth=".7"
          opacity=".3"
        />
        <path
          d="m13 17 4 2 7-9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        amigos secretos
        <svg className="brand-underline" viewBox="0 0 200 8" fill="none" aria-hidden="true">
          <path
            d="M2 5c50-5 116-5 196-2M34 7c60-4 109-3 143-2"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </Link>
  );
}
