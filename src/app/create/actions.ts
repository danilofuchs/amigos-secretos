'use server';
import { getI18n } from '@/lib/i18n/server';
import { isRaffleId } from '@/lib/codes';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ownerId } from '@/lib/session';
import { createRaffle, updateRaffle, type RaffleAction } from '@/lib/store';
import { validateInput, ValidationError, type RaffleInput } from '@/lib/raffle';
import { isPastDay } from '@/lib/exchange-details';
import { fieldOfError, type FormField } from '@/lib/form-fields';

const ACTIONS: RaffleAction[] = ['save', 'draw', 'redraw', 'archive'];
export type ActionState = {
  error?: string;
  /** Which field the error is about, so the form can turn to its page and mark it. */
  field?: FormField;
  success?: string;
  version?: number;
  /** The submitted form, so a field error disappears once that field changes. */
  input?: string;
};
/** A new raffle and every draw need an event that hasn't happened yet; today still counts. */
function assertUpcoming(input: RaffleInput) {
  // A day of slack: the organizer's "today" may still be yesterday in UTC.
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (input.details && isPastDay(input.details.date, yesterday))
    throw new ValidationError('errors.datePast', "The date can't be in the past.");
}

export async function saveRaffle(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { t } = await getI18n();
  let destination: string | undefined;
  let version: number | undefined;
  try {
    const id = form.get('id');
    const action = form.get('intent');
    if (typeof action !== 'string' || !ACTIONS.includes(action as RaffleAction))
      throw new ValidationError('errors.invalidAction', 'Invalid action.');
    const owner = await ownerId(!id);
    if (!owner)
      throw new ValidationError(
        'errors.sessionExpiredReturnExchanges',
        'Your session expired. Return to your exchanges.',
      );
    const rawInput = form.get('input');
    if (action !== 'archive' && typeof rawInput !== 'string')
      throw new ValidationError('errors.invalidDetails', 'Invalid details.');
    const input =
      action === 'archive'
        ? null
        : validateInput(JSON.parse(typeof rawInput === 'string' ? rawInput : 'null'));
    if (input && (!id || action === 'draw' || action === 'redraw')) assertUpcoming(input);
    if (input && typeof rawInput === 'string' && !JSON.parse(rawInput).title.trim())
      input.title = t('actions.giftExchange', 'Gift exchange');
    if (!id) {
      if (!input) throw new ValidationError('errors.invalidDetails', 'Invalid details.');
      const created = await createRaffle(owner, input);
      // Creating and drawing is one press: the raffle stays editable until someone opens a ticket.
      if (action === 'draw') await updateRaffle(owner, created, 0, input, 'draw');
      revalidatePath('/sorteios');
      destination = `/sorteios/${created}`;
    } else {
      const expected = Number(form.get('version'));
      if (
        typeof id !== 'string' ||
        !isRaffleId(id) ||
        !Number.isSafeInteger(expected) ||
        expected < 0
      )
        throw new ValidationError('errors.invalidExchange', 'Invalid exchange.');
      version = await updateRaffle(owner, id, expected, input, action as RaffleAction);
      revalidatePath(`/sorteios/${id}`);
      revalidatePath('/sorteios');
      if (action === 'archive') destination = '/sorteios';
    }
  } catch (error) {
    const id = form.get('id');
    if (typeof id === 'string' && isRaffleId(id)) revalidatePath(`/sorteios/${id}`);
    if (!(error instanceof ValidationError))
      console.error(
        'Raffle action failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
    if (error instanceof ValidationError) {
      const field = fieldOfError(error.id);
      return { error: t(error.id, error.message), ...(field ? { field } : {}) };
    }
    return { error: t('actions.couldntSaveTryAgain', "Couldn't save. Try again in a moment.") };
  }
  if (destination) redirect(destination);
  return {
    ...(version === undefined ? {} : { version }),
    success:
      form.get('intent') === 'redraw'
        ? t('actions.namesDrawnAgainLinks', 'Names drawn again. The links stay the same.')
        : t('actions.exchangeUpdated', 'Exchange updated.'),
  };
}
