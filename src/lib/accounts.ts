import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { query } from './db';
import { GOOGLE_CLIENT_ID } from './google-client';

export const NONCE_COOKIE = 'google-nonce';

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

/** The Google user behind a Sign in with Google credential, or an error if it isn't one for this app. */
export async function verifyGoogleCredential(
  credential: string,
  nonce: string,
  keys: JWTVerifyGetKey = googleKeys,
) {
  const { payload } = await jwtVerify(credential, keys, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: GOOGLE_CLIENT_ID,
    algorithms: ['RS256'],
  });
  if (!nonce || payload.nonce !== nonce) throw new Error('Sign-in nonce mismatch');
  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Credential has no subject');
  return {
    sub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : '',
  };
}

// D1 gets its schema by hand; account statements bring their own table so sign-in works on a database created before accounts existed.
const ACCOUNTS = {
  sql: 'CREATE TABLE IF NOT EXISTS accounts (google_sub TEXT PRIMARY KEY, owner TEXT NOT NULL UNIQUE, email TEXT NOT NULL, created_at TEXT NOT NULL)',
};

export async function accountEmail(owner: string): Promise<string | null> {
  const [, found] = await query([
    ACCOUNTS,
    { sql: 'SELECT email FROM accounts WHERE owner = ?', params: [owner] },
  ]);
  const row = found?.results[0];
  return row ? String(row.email) : null;
}

/**
 * The owner id this browser should carry after signing in. A browser not yet tied to an account
 * brings its exchanges along; one signed in to another account switches without moving anything.
 */
export async function signIn(
  account: { sub: string; email: string },
  current: string | null,
  newOwner: () => string,
): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const [, found, linked] = await query([
      ACCOUNTS,
      { sql: 'SELECT owner FROM accounts WHERE google_sub = ?', params: [account.sub] },
      { sql: 'SELECT 1 FROM accounts WHERE owner = ?', params: [current ?? ''] },
    ]);
    const anonymous = current !== null && !linked?.results.length;
    const existing = found?.results[0]?.owner;
    if (typeof existing === 'string') {
      await query([
        {
          sql: 'UPDATE accounts SET email = ? WHERE google_sub = ?',
          params: [account.email, account.sub],
        },
        ...(anonymous && current !== existing
          ? [
              {
                sql: 'UPDATE raffles SET owner = ? WHERE owner = ? AND NOT EXISTS (SELECT 1 FROM accounts WHERE owner = ?)',
                params: [existing, current, current],
              },
            ]
          : []),
      ]);
      return existing;
    }
    await query([
      {
        sql: 'INSERT OR IGNORE INTO accounts (google_sub, owner, email, created_at) VALUES (?, ?, ?, ?)',
        params: [
          account.sub,
          anonymous ? current : newOwner(),
          account.email,
          new Date().toISOString(),
        ],
      },
    ]);
  }
  throw new Error('Could not link the account');
}
