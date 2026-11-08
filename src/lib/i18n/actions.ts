'use server';
import { cookies } from 'next/headers';
import { isLocale } from './index';
export async function setLanguage(locale: string) {
  if (!isLocale(locale)) throw new Error('Unsupported language');
  (await cookies()).set('language', locale, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
  });
}
