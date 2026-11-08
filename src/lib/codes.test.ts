import { test } from 'vitest';
import assert from 'node:assert/strict';
import { normalizeTicketCode, isRaffleId } from './codes.ts';
test('base62 links preserve case through ticket lookup', () => {
  assert.equal(normalizeTicketCode('aB9xZ2mN4qR7'), 'aB9xZ2mN4qR7');
  assert.notEqual(normalizeTicketCode('aB9xZ2mN4qR7'), normalizeTicketCode('AB9XZ2MN4QR7'));
  assert.equal(isRaffleId('aB9xZ2mN4qR7'), true);
});
test('rejects malformed codes and retired long codes', () => {
  for (const code of ['hello', '../sorteios', 'aB9xZ2mN4qR!', 'a'.repeat(48), '']) {
    assert.equal(normalizeTicketCode(code), null);
    assert.equal(isRaffleId(code), false);
  }
});
