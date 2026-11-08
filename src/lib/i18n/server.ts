import { cookies, headers } from 'next/headers';
import { defaultCurrency, negotiateLocale, translator } from './index';
export async function getI18n() {
  const [jar, requestHeaders] = await Promise.all([cookies(), headers()]);
  const locale = negotiateLocale(
    jar.get('language')?.value,
    requestHeaders.get('accept-language') ?? '',
  );
  return {
    locale,
    currency: defaultCurrency(locale, requestHeaders.get('accept-language') ?? ''),
    t: translator(locale),
  };
}
