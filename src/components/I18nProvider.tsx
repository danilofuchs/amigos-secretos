'use client';
import { useContext, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { isLocale, locales, localeNames, translator, type Locale } from '@/lib/i18n';
import { LanguageContext } from './I18nContext';
import { setLanguage } from '@/lib/i18n/actions';
export function I18nProvider({
  locale: initial,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const [locale, update] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();
  function change(next: Locale) {
    start(async () => {
      try {
        await setLanguage(next);
        update(next);
        setError('');
        document.documentElement.lang = next;
        router.refresh();
      } catch {
        setError(translator(locale)('languagePicker.saveFailed', "Couldn't save your language."));
      }
    });
  }
  return (
    <LanguageContext value={{ locale, change, pending }}>
      {children}
      {error && <output role="alert">{error}</output>}
    </LanguageContext>
  );
}
export function LanguagePicker() {
  const { locale, change, pending } = useContext(LanguageContext);
  return (
    <label className="language-picker">
      <span className="sr-only">Idioma / Language / Idioma</span>
      <select
        className="paper-select"
        value={locale}
        disabled={pending}
        onChange={(e) => {
          if (isLocale(e.target.value)) change?.(e.target.value);
        }}
      >
        {locales.map((value) => (
          <option key={value} value={value} lang={value}>
            {localeNames[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
