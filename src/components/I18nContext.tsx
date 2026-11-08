'use client';
import { createContext, useContext } from 'react';
import { translator, type Locale } from '@/lib/i18n';
export const LanguageContext = createContext<{
  locale: Locale;
  change?: (locale: Locale) => void;
  pending?: boolean;
}>({ locale: 'pt-BR' });

export function useI18n() {
  const { locale } = useContext(LanguageContext);
  return { locale, t: translator(locale) };
}
