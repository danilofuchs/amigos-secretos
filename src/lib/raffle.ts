import { randomInt } from 'node:crypto';
import { MAX_NAME_LENGTH } from './form-fields';
import { matchParticipants } from './matching';

export type Participant = { id: string; name: string };
export type Exclusion = { from: string; to: string };
export const DEFAULT_TITLE = 'Amigo secreto';
export type { ExchangeDetails } from './exchange-details';
import { isCleanName, isCleanText } from './text-rules';
import {
  budgetIsValid,
  budgetKinds,
  emptyDetails,
  isPastDay,
  normalizeBudget,
  withDetailDefaults,
  type ExchangeDetails,
} from './exchange-details';
export type RaffleInput = {
  details?: ExchangeDetails;
  title: string;
  rules: string;
  participants: Participant[];
  exclusions: Exclusion[];
};
export type Raffle = RaffleInput & {
  id: string;
  status: 'draft' | 'drawn' | 'archived';
  createdAt: string;
  version: number;
  /** Changes on every draw; a ticket opens only for the draw it was loaded with. */
  drawId?: string;
  tickets: Ticket[];
};
export type Ticket = { name: string; code: string; participantId?: string };
/** A message the person can act on: a stable id plus its English default, translated where it is shown. */
export class ValidationError extends Error {
  readonly id: string;
  constructor(...[id, defaultMessage]: readonly [id: string, defaultMessage: string]) {
    super(defaultMessage);
    this.id = id;
  }
}

export function validateInput(input: unknown): RaffleInput {
  if (!input || typeof input !== 'object')
    throw new ValidationError('errors.invalidDetails', 'Invalid details.');
  const value = input as RaffleInput;
  if (
    typeof value.title !== 'string' ||
    value.title.length > 120 ||
    !isCleanText(value.title, false)
  )
    throw new ValidationError(
      'errors.useExchangeNameUp',
      'Use an exchange name of up to 120 characters.',
    );
  if (
    typeof value.rules !== 'string' ||
    value.rules.length > 5000 ||
    !isCleanText(value.rules, true)
  )
    throw new ValidationError('errors.rulesMustAtMost', 'Rules must be at most 5,000 characters.');
  if (
    !Array.isArray(value.participants) ||
    value.participants.length < 2 ||
    value.participants.length > 100
  )
    throw new ValidationError('errors.addBetween2100', 'Add between 2 and 100 participants.');
  const ids = new Set<string>();
  const names = new Set<string>();
  const participants = value.participants.map((p) => {
    if (
      !p ||
      typeof p.id !== 'string' ||
      !/^[a-zA-Z0-9-]{1,64}$/.test(p.id) ||
      ids.has(p.id) ||
      typeof p.name !== 'string' ||
      !p.name.trim() ||
      p.name.trim().length > MAX_NAME_LENGTH ||
      !isCleanName(p.name.trim())
    )
      throw new ValidationError('errors.checkParticipantNames', 'Check the participant names.');
    const name = p.name.trim();
    const key = name.normalize('NFKC').toLocaleLowerCase('pt-BR');
    if (names.has(key))
      throw new ValidationError(
        'errors.useDistinctNamesIdentify',
        'Use distinct names to identify each participant.',
      );
    ids.add(p.id);
    names.add(key);
    return { id: p.id, name };
  });
  if (
    !Array.isArray(value.exclusions) ||
    value.exclusions.length > 9900 ||
    value.exclusions.some((e) => !e || !ids.has(e.from) || !ids.has(e.to) || e.from === e.to)
  )
    throw new ValidationError('errors.checkExclusions', 'Check the exclusions.');
  let details: ExchangeDetails | undefined;
  if (value.details !== undefined) {
    const raw =
      value.details && typeof value.details === 'object'
        ? withDetailDefaults(value.details)
        : value.details;
    if (
      !raw ||
      typeof raw !== 'object' ||
      Object.keys(emptyDetails).some((key) => typeof raw[key as keyof ExchangeDetails] !== 'string')
    )
      throw new ValidationError(
        'errors.checkDateCurrencyBudget',
        'Check the date, currency and budget.',
      );
    if (!budgetKinds.includes(raw.budgetKind))
      throw new ValidationError(
        'errors.checkDateCurrencyBudget',
        'Check the date, currency and budget.',
      );
    details = normalizeBudget({
      occasion: raw.occasion.trim(),
      date: raw.date,
      time: raw.time,
      location: raw.location.trim(),
      currency: raw.currency,
      budget: raw.budget,
      ...(raw.budgetMin === undefined ? {} : { budgetMin: raw.budgetMin }),
      budgetKind: raw.budgetKind,
      theme: raw.theme.trim(),
    });
    if (!budgetIsValid(details))
      throw new ValidationError(
        'errors.checkDateCurrencyBudget',
        'Check the date, currency and budget.',
      );
    const date = details.date ? new Date(`${details.date}T12:00:00Z`) : null;
    if (
      details.occasion.length > 120 ||
      details.theme.length > 240 ||
      !isCleanText(details.occasion, false) ||
      details.location.length > 120 ||
      !isCleanText(details.location, false) ||
      (details.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(details.time)) ||
      !isCleanText(details.theme, false) ||
      (details.date &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(details.date) ||
          !date ||
          !Number.isFinite(date.getTime()) ||
          date.toISOString().slice(0, 10) !== details.date)) ||
      (details.currency && !/^[A-Z]{3}$/.test(details.currency))
    )
      throw new ValidationError(
        'errors.checkDateCurrencyBudget',
        'Check the date, currency and budget.',
      );
  }
  return {
    ...(details ? { details } : {}),
    title: value.title.trim() || DEFAULT_TITLE,
    rules: value.rules.trim(),
    participants,
    exclusions: value.exclusions,
  };
}

/** A new raffle and every draw need an event that hasn't happened yet; today still counts. */
export function assertUpcoming(input: RaffleInput) {
  // A day of slack: the organizer's "today" may still be yesterday in UTC.
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (input.details && isPastDay(input.details.date, yesterday))
    throw new ValidationError('errors.datePast', "The date can't be in the past.");
}

/** A random valid draw; not a uniform sample of every possible one. */
export function draw(participants: Participant[], exclusions: Exclusion[]): Map<string, string> {
  const shuffle = <T>(values: T[]) => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      // Both indices are bounded by the current array length.
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  };
  const result = matchParticipants(participants, exclusions, shuffle);
  if (!result.ok)
    throw new ValidationError(
      'errors.theseExclusionsPreventValid',
      'These exclusions prevent a valid draw. Remove some and try again.',
    );
  return result.recipientOf;
}
