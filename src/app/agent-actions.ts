'use server';
import { getI18n } from '@/lib/i18n/server';
import { shareMessage, ticketPath } from '@/lib/i18n';
import { ownerId } from '@/lib/session';
import { createRaffle, getRaffle, getTicketOpens, listRaffles } from '@/lib/store';
import { assertUpcoming, validateInput, ValidationError } from '@/lib/raffle';
import { toRaffleInput, type AgentExchange } from '@/lib/agent-input';
import { isRaffleId } from '@/lib/codes';
import { revalidatePath } from 'next/cache';

// Agents act as the organizer in this browser: same cookie, same validation as the form.

export async function listExchangesForAgent() {
  const owner = await ownerId();
  if (!owner) return { exchanges: [] };
  return {
    exchanges: (await listRaffles(owner)).map((r) => ({
      id: r.id,
      name: r.title,
      status: r.status,
      participants: r.participants.length,
      exclusions: r.exclusions.length,
      path: `/sorteios/${r.id}`,
    })),
  };
}

export async function createExchangeForAgent(
  args: AgentExchange,
): Promise<{ id: string; path: string } | { error: string }> {
  const { t } = await getI18n();
  const input = toRaffleInput(args, () => crypto.randomUUID());
  if ('unknownName' in input) return { error: `"${input.unknownName}" is not one of the names.` };
  try {
    const valid = validateInput(input);
    if (!valid.title) valid.title = t('actions.giftExchange', 'Gift exchange');
    assertUpcoming(valid);
    const owner = await ownerId(true);
    if (!owner) return { error: 'No organizer session.' };
    const id = await createRaffle(owner, valid);
    revalidatePath('/sorteios');
    return { id, path: `/sorteios/${id}` };
  } catch (error) {
    if (error instanceof ValidationError) return { error: t(error.id, error.message) };
    console.error('Agent exchange failed:', error instanceof Error ? error.message : 'unknown');
    return { error: "Couldn't create the exchange. Try again in a moment." };
  }
}

export async function ticketLinksForAgent(id: string, origin: string) {
  const owner = await ownerId();
  if (!owner || !isRaffleId(id)) return { error: 'Exchange not found.' };
  const raffle = await getRaffle(id, owner);
  if (!raffle) return { error: 'Exchange not found.' };
  if (raffle.status !== 'drawn') return { error: 'Names have not been drawn yet.' };
  const { locale } = await getI18n();
  const opens = await getTicketOpens(id, owner);
  return {
    name: raffle.title,
    tickets: raffle.tickets.map((ticket) => {
      const url = String(new URL(ticketPath(ticket.code, locale), origin));
      return {
        person: ticket.name,
        url,
        message: shareMessage(locale, ticket.name, raffle.title, url),
        opened: ticket.code in opens,
      };
    }),
  };
}
