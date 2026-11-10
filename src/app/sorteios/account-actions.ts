'use server';
import { cookies } from 'next/headers';
import { NONCE_COOKIE, signIn, verifyGoogleCredential } from '@/lib/accounts';
import { clearOwnerId, ownerId, setOwnerId } from '@/lib/session';
import { secret } from '@/lib/store';

export async function finishGoogleSignIn(credential: unknown): Promise<{ ok: boolean }> {
  const jar = await cookies();
  const nonce = jar.get(NONCE_COOKIE)?.value ?? '';
  jar.delete({ name: NONCE_COOKIE, path: '/sorteios' });
  if (typeof credential !== 'string' || credential.length > 8192) return { ok: false };
  try {
    const account = await verifyGoogleCredential(credential, nonce);
    await setOwnerId(await signIn(account, await ownerId(), secret));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function signOut() {
  await clearOwnerId();
}
