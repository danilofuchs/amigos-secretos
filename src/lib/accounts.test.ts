import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { signIn, verifyGoogleCredential } from './accounts';
import { query } from './db';
import { GOOGLE_CLIENT_ID } from './google-client';

describe('verifyGoogleCredential', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), alg: 'RS256' }] });
  const token = (claims: Record<string, unknown> = {}, expires = '5m') =>
    new SignJWT({
      iss: 'https://accounts.google.com',
      aud: GOOGLE_CLIENT_ID,
      sub: 'google-123',
      nonce: 'n1',
      email: 'ana@example.com',
      ...claims,
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime(expires)
      .sign(privateKey);

  it('accepts a credential for this app with the expected nonce', async () => {
    await expect(verifyGoogleCredential(await token(), 'n1', keys)).resolves.toEqual({
      sub: 'google-123',
      email: 'ana@example.com',
    });
  });
  it('refuses another nonce, another app, another issuer or an expired credential', async () => {
    const refused = async (credential: Promise<string>, nonce: string) =>
      verifyGoogleCredential(await credential, nonce, keys);
    await expect(refused(token(), 'n2')).rejects.toThrow('nonce mismatch');
    await expect(refused(token(), '')).rejects.toThrow('nonce mismatch');
    await expect(refused(token({ aud: 'other' }), 'n1')).rejects.toThrow('"aud" claim');
    await expect(refused(token({ iss: 'https://evil.example' }), 'n1')).rejects.toThrow(
      '"iss" claim',
    );
    await expect(refused(token({}, '-1m'), 'n1')).rejects.toThrow('"exp" claim');
  });
});

describe('signIn', () => {
  beforeAll(() => {
    vi.stubEnv('SQLITE_PATH', join(mkdtempSync(join(tmpdir(), 'accounts-')), 'test.sqlite'));
  });
  let next = 0;
  const newOwner = () => `NEW${next++}`;
  const addRaffle = (id: string, owner: string) =>
    query([
      {
        sql: 'INSERT INTO raffles (id, owner, payload, created_at) VALUES (?, ?, ?, ?)',
        params: [id, owner, '{}', new Date().toISOString()],
      },
    ]);
  const ownerOf = async (id: string) =>
    (await query([{ sql: 'SELECT owner FROM raffles WHERE id = ?', params: [id] }]))[0].results[0]
      ?.owner;

  it('turns this browser into the account on first sign-in', async () => {
    await addRaffle('r1', 'PHONE');
    expect(await signIn({ sub: 'ana', email: 'ana@x' }, 'PHONE', newOwner)).toBe('PHONE');
    expect(await ownerOf('r1')).toBe('PHONE');
  });
  it('brings a new device’s exchanges into the account', async () => {
    await addRaffle('r2', 'LAPTOP');
    expect(await signIn({ sub: 'ana', email: 'ana@x' }, 'LAPTOP', newOwner)).toBe('PHONE');
    expect(await ownerOf('r2')).toBe('PHONE');
  });
  it('switches accounts without taking the other account’s exchanges', async () => {
    const bia = await signIn({ sub: 'bia', email: 'bia@x' }, 'PHONE', newOwner);
    expect(bia).not.toBe('PHONE');
    expect(await ownerOf('r1')).toBe('PHONE');
    expect(await signIn({ sub: 'ana', email: 'ana@x' }, bia, newOwner)).toBe('PHONE');
    expect(await ownerOf('r1')).toBe('PHONE');
  });
  it('gives a browser with no exchanges yet the account it signs in to', async () => {
    expect(await signIn({ sub: 'ana', email: 'ana@x' }, null, newOwner)).toBe('PHONE');
  });
});
