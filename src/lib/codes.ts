import { randomInt } from 'node:crypto';
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export function shortCode(): string {
  return Array.from({ length: 12 }, () => alphabet[randomInt(alphabet.length)]).join('');
}
export function normalizeTicketCode(code: string): string | null {
  return /^[A-Za-z0-9]{12}$/.test(code) ? code : null;
}
export function isRaffleId(id: string): boolean {
  return /^[A-Za-z0-9]{12}$/.test(id);
}
