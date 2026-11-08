import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

type Statement = { sql: string; params?: (string | number | null)[] };
type Result = { results: Record<string, unknown>[]; meta: { changes: number } };
export async function query(
  statements: [Statement, ...Statement[]],
): Promise<[Result, ...Result[]]> {
  const {
    CLOUDFLARE_ACCOUNT_ID: account,
    CLOUDFLARE_D1_DATABASE_ID: database,
    CLOUDFLARE_API_TOKEN: token,
  } = process.env;
  if (account && database && token) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: statements }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) throw new Error('D1 request failed');
    const body = (await response.json()) as {
      success: boolean;
      result: (Result & { success: boolean })[];
    };
    if (!body.success || body.result.some((r: { success: boolean }) => !r.success))
      throw new Error('D1 query failed');
    const [first, ...rest] = body.result;
    if (!first) throw new Error('D1 returned an empty query batch');
    return [first, ...rest];
  }
  if (account || database || token || process.env.VERCEL)
    throw new Error('Configure all Cloudflare D1 environment variables.');
  const path = process.env.SQLITE_PATH || join(process.cwd(), '.data', 'amigos-secretos.sqlite');
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  try {
    db.exec(readFileSync(join(process.cwd(), 'schema.sql'), 'utf8'));
    db.exec('BEGIN IMMEDIATE');
    const result = statements.map(({ sql, params = [] }) => {
      const stmt = db.prepare(sql);
      if (stmt.columns().length)
        return { results: stmt.all(...params) as Record<string, unknown>[], meta: { changes: 0 } };
      return { results: [], meta: { changes: Number(stmt.run(...params).changes) } };
    });
    const [first, ...rest] = result;
    if (!first) throw new Error('Empty query batch');
    db.exec('COMMIT');
    return [first, ...rest];
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}
