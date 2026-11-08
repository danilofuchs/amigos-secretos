import { withDetailDefaults } from './exchange-details';
import type { ExchangeDetails } from './raffle';
import { randomBytes } from 'node:crypto';
import { shortCode } from './codes';
import { query } from './db';
import { draw, ValidationError, type Raffle, type RaffleInput } from './raffle';

const STALE = [
  'errors.exchangeChangedAnotherTab',
  'This exchange changed in another tab. Refresh the page.',
] as const;
const UNOPENED =
  'NOT EXISTS (SELECT 1 FROM tickets t JOIN ticket_opens o ON o.code = t.code WHERE t.raffle_id = ?)';
export type RaffleAction = 'save' | 'draw' | 'redraw' | 'archive';
export const secret = () => randomBytes(24).toString('hex').toUpperCase();
export async function listRaffles(owner: string): Promise<Raffle[]> {
  const [r] = await query([
    {
      sql: 'SELECT payload FROM raffles WHERE owner = ? ORDER BY created_at DESC',
      params: [owner],
    },
  ]);
  return r.results.map((row) => JSON.parse(row.payload as string));
}
export async function getRaffle(id: string, owner: string): Promise<Raffle | null> {
  const [r] = await query([
    { sql: 'SELECT payload FROM raffles WHERE id = ? AND owner = ?', params: [id, owner] },
  ]);
  return r.results[0] ? JSON.parse(r.results[0].payload as string) : null;
}
export async function createRaffle(owner: string, input: RaffleInput): Promise<string> {
  const raffle: Raffle = {
    ...input,
    id: shortCode(),
    status: 'draft',
    version: 0,
    createdAt: new Date().toISOString(),
    tickets: [],
  };
  await query([
    {
      sql: 'INSERT INTO raffles (id, owner, payload, created_at) VALUES (?, ?, ?, ?)',
      params: [raffle.id, owner, JSON.stringify(raffle), raffle.createdAt],
    },
  ]);
  return raffle.id;
}
export async function updateRaffle(
  owner: string,
  id: string,
  version: number,
  input: RaffleInput | null,
  action: RaffleAction,
): Promise<number> {
  const raffle = await getRaffle(id, owner);
  if (!raffle) throw new ValidationError('errors.exchangeNotFound', 'Exchange not found.');
  if (raffle.version !== version) throw new ValidationError(...STALE);
  if (raffle.status === 'archived')
    throw new ValidationError('errors.exchangeHasBeenArchived', 'This exchange has been archived.');
  if (input) {
    if (
      raffle.status !== 'draft' &&
      action !== 'redraw' &&
      JSON.stringify([raffle.participants, raffle.exclusions]) !==
        JSON.stringify([input.participants, input.exclusions])
    )
      throw new ValidationError(
        'errors.participantsExclusionsCannotChanged',
        'Participants and exclusions cannot be changed after the draw.',
      );
    Object.assign(raffle, input);
  }
  if (action === 'draw' || action === 'redraw') {
    if (action === 'draw' && raffle.status !== 'draft')
      throw new ValidationError('errors.namesHaveAlreadyBeen', 'Names have already been drawn.');
    if (action === 'redraw' && raffle.status !== 'drawn')
      throw new ValidationError('errors.namesHaventBeenDrawn', "Names haven't been drawn yet.");
    return publishDraw(owner, raffle, version);
  }
  if (action === 'archive') raffle.status = 'archived';
  raffle.version++;
  const [r] = await query([
    {
      sql: 'UPDATE raffles SET payload = ?, version = ? WHERE id = ? AND owner = ? AND version = ? RETURNING id',
      params: [JSON.stringify(raffle), raffle.version, id, owner, version],
    },
  ]);
  if (!r.results.length) throw new ValidationError(...STALE);
  return raffle.version;
}

/**
 * Publishes a draw in one batch. Each person keeps the link they already had, so a redraw only
 * changes who they drew; it applies only while nobody has opened a ticket.
 */
async function publishDraw(owner: string, raffle: Raffle, expected: number) {
  const id = raffle.id;
  const pairs = draw(raffle.participants, raffle.exclusions);
  const recipients = new Map(raffle.participants.map((p) => [p.id, p.name]));
  const previous = new Map(raffle.tickets.map((t) => [t.participantId ?? t.name, t.code]));
  raffle.tickets = raffle.participants.map((p) => ({
    participantId: p.id,
    name: p.name,
    code: previous.get(p.id) ?? previous.get(p.name) ?? shortCode(),
  }));
  raffle.drawId = shortCode();
  raffle.status = 'drawn';
  raffle.version = expected + 1;
  const current = `EXISTS (SELECT 1 FROM raffles WHERE id = ? AND json_extract(payload, '$.drawId') = ?)`;
  const [r] = await query([
    {
      sql: `UPDATE raffles SET payload = ?, version = ? WHERE id = ? AND owner = ? AND version = ? AND ${UNOPENED} RETURNING id`,
      params: [JSON.stringify(raffle), raffle.version, id, owner, expected, id],
    },
    {
      sql: `DELETE FROM tickets WHERE raffle_id = ? AND ${current}`,
      params: [id, id, raffle.drawId],
    },
    ...raffle.tickets.map((t) => ({
      sql: `INSERT INTO tickets (code, raffle_id, recipient) SELECT ?, ?, ? WHERE ${current}`,
      params: [t.code, id, recipients.get(pairs.get(t.participantId!)!)!, id, raffle.drawId!],
    })),
  ]);
  if (!r.results.length) {
    const [check] = await query([
      { sql: `SELECT 1 FROM raffles WHERE id = ? AND ${UNOPENED}`, params: [id, id] },
    ]);
    const [errorId, message] = check.results.length
      ? STALE
      : ([
          'errors.someoneHasOpenedSlip',
          'Someone has opened a slip. The draw can no longer be changed.',
        ] as const);
    throw new ValidationError(errorId, message);
  }
  return raffle.version;
}

export async function getTicket(code: string): Promise<{
  name: string;
  title: string;
  rules: string;
  details: ExchangeDetails;
  drawId: string;
} | null> {
  const [r] = await query([
    {
      sql: "SELECT t.recipient, json_extract(r.payload, '$.title') AS title, json_extract(r.payload, '$.rules') AS rules, json_extract(r.payload, '$.details') AS details, COALESCE(json_extract(r.payload, '$.drawId'), '') AS draw_id FROM tickets t JOIN raffles r ON r.id = t.raffle_id WHERE t.code = ? AND json_extract(r.payload, '$.status') = 'drawn'",
      params: [code],
    },
  ]);
  const row = r.results[0];
  return row
    ? {
        name: row.recipient as string,
        title: row.title as string,
        rules: row.rules as string,
        details: withDetailDefaults(
          row.details ? (JSON.parse(row.details as string) as Partial<ExchangeDetails>) : {},
        ),
        drawId: row.draw_id as string,
      }
    : null;
}
/** Records the open only for the draw the ticket page was loaded with; false means it is stale. */
export async function markTicketOpened(code: string, drawId: string): Promise<boolean> {
  const [, r] = await query([
    {
      sql: "INSERT OR IGNORE INTO ticket_opens (code, opened_at) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM tickets t JOIN raffles r ON r.id = t.raffle_id WHERE t.code = ? AND json_extract(r.payload, '$.status') = 'drawn' AND COALESCE(json_extract(r.payload, '$.drawId'), '') = ?)",
      params: [code, new Date().toISOString(), code, drawId],
    },
    {
      sql: "SELECT 1 FROM tickets t JOIN raffles r ON r.id = t.raffle_id WHERE t.code = ? AND COALESCE(json_extract(r.payload, '$.drawId'), '') = ?",
      params: [code, drawId],
    },
  ]);
  return r!.results.length > 0;
}
export async function getTicketOpens(id: string, owner: string): Promise<Record<string, string>> {
  const [r] = await query([
    {
      sql: 'SELECT o.code, o.opened_at FROM ticket_opens o JOIN tickets t ON t.code = o.code JOIN raffles r ON r.id = t.raffle_id WHERE r.id = ? AND r.owner = ?',
      params: [id, owner],
    },
  ]);
  return Object.fromEntries(r.results.map((row) => [row.code as string, row.opened_at as string]));
}
