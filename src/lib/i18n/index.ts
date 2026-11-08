import IntlMessageFormat from 'intl-messageformat';
import type { ExchangeDetails } from '../exchange-details';
import es from './messages/es.json';
import ptBR from './messages/pt-BR.json';
export const locales = ['pt-BR', 'en', 'es'] as const;
export type Locale = (typeof locales)[number];
export const localeNames: Record<Locale, string> = {
  'pt-BR': 'Português',
  en: 'English',
  es: 'Español',
};
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && locales.some((locale) => locale === value);
}
export function negotiateLocale(cookie?: string, accept = ''): Locale {
  if (isLocale(cookie)) return cookie;
  const languages = accept
    .split(',')
    .map((part, index) => {
      const [language = '', ...parameters] = part.trim().split(';');
      const quality = parameters.find((p) => p.trim().startsWith('q='));
      const q = quality ? Number(quality.trim().slice(2)) : 1;
      return { language: language.toLowerCase(), q: Number.isFinite(q) ? q : 0, index };
    })
    .filter((item) => item.q > 0 && item.q <= 1)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { language } of languages) {
    if (language === 'pt' || language.startsWith('pt-')) return 'pt-BR';
    if (language === 'en' || language.startsWith('en-')) return 'en';
    if (language === 'es' || language.startsWith('es-')) return 'es';
  }
  return 'pt-BR';
}
/** English lives next to the code as each message's default; other locales come from messages/*.json. */
const translations: Record<Exclude<Locale, 'en'>, Record<string, string>> = { 'pt-BR': ptBR, es };
export type MessageValues = Record<string, string | number>;
export type Translate = (id: string, defaultMessage: string, values?: MessageValues) => string;
const formats = new Map<string, IntlMessageFormat>();

export function translator(locale: Locale): Translate {
  return (id, defaultMessage, values) => {
    const message = locale === 'en' ? defaultMessage : (translations[locale][id] ?? defaultMessage);
    const key = `${locale}\u0000${message}`;
    let format = formats.get(key);
    if (!format) {
      format = new IntlMessageFormat(message, locale);
      formats.set(key, format);
    }
    return String(format.format(values));
  };
}

/** A ticket's link names the language its message was sent in, so link previews match it. */
export const ticketPath = (code: string, locale: Locale) => `/${code}?lang=${locale}`;

export function shareMessage(locale: Locale, name: string, title: string, url: string) {
  return translator(locale)(
    'share.message',
    "Hi, {name}! You're taking part in “{title}” on Amigos Secretos.\n\nOpen your slip to see who you're buying a gift for and check the details:\n{url}\n\nThis link is just for you. Keep it private!",
    { name, title, url },
  );
}

export function defaultCurrency(locale: Locale, accept = ''): string {
  const language = locale.split('-')[0];
  const candidates = accept
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { tag, quality: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((item) => item.quality > 0)
    .sort((a, b) => b.quality - a.quality);
  let region: string | undefined;
  for (const { tag } of candidates) {
    try {
      const parsed = new Intl.Locale(tag);
      if (parsed.language === language) {
        region = parsed.maximize().region;
        break;
      }
    } catch {
      /* ignore malformed language tags */
    }
  }
  region ??= new Intl.Locale(locale).maximize().region;
  const currencies: Record<string, string> = {
    BR: 'BRL',
    PT: 'EUR',
    US: 'USD',
    GB: 'GBP',
    IE: 'EUR',
    ES: 'EUR',
    MX: 'MXN',
    CO: 'COP',
    PH: 'PHP',
    JP: 'JPY',
    CA: 'CAD',
    AU: 'AUD',
    NZ: 'NZD',
    AR: 'ARS',
    CL: 'CLP',
    PE: 'PEN',
    UY: 'UYU',
    CH: 'CHF',
  };
  return currencies[region ?? ''] ?? (locale === 'pt-BR' ? 'BRL' : locale === 'en' ? 'USD' : 'EUR');
}

/** States the budget the way it was set: a range, a ceiling, a floor or a rough value. */
export function formatBudget(locale: Locale, details: ExchangeDetails): string {
  if (!details.currency || (!details.budget && !details.budgetMin)) return '';
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: details.currency });
  const t = translator(locale);
  const low = Number(details.budgetMin || details.budget),
    high = Number(details.budget || details.budgetMin);
  switch (details.budgetKind) {
    case 'range':
      return low === high ? money.format(high) : money.formatRange(low, high);
    case 'max':
      return t('budget.upToAmount', 'up to {amount}', { amount: money.format(high) });
    case 'min':
      return t('budget.amountOrMore', '{amount} or more', { amount: money.format(low) });
    case 'about':
      return t('budget.aboutAmount', 'about {amount}', { amount: money.format(high) });
  }
}
