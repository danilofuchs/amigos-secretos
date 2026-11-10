import { cookies } from 'next/headers';
import { secret } from './store';
const cookieName = 'amigos-secretos-owner';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
} as const;
export async function ownerId(create = false): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(cookieName)?.value;
  if (value && /^[A-F0-9]{48}$/.test(value)) return value;
  if (!create) return null;
  const id = secret();
  jar.set(cookieName, id, cookieOptions);
  return id;
}
export async function setOwnerId(id: string) {
  (await cookies()).set(cookieName, id, cookieOptions);
}
export async function clearOwnerId() {
  (await cookies()).delete(cookieName);
}
