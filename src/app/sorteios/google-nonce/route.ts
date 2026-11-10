import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { NONCE_COOKIE } from '@/lib/accounts';

/** A one-time value the Google credential must carry, so a credential minted elsewhere is refused. */
export function POST() {
  const nonce = randomBytes(16).toString('hex');
  const response = NextResponse.json({ nonce }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/sorteios',
    maxAge: 60 * 30,
  });
  return response;
}
