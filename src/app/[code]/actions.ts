'use server';
import { normalizeTicketCode } from '@/lib/codes';
import { markTicketOpened } from '@/lib/store';

/** False when the organizer drew again after this page loaded. */
export async function markOpened(code: string, drawId: string): Promise<boolean> {
  const normalized = normalizeTicketCode(code);
  return normalized ? markTicketOpened(normalized, drawId) : false;
}
