import { budgetKinds, emptyDetails, type ExchangeDetails } from './exchange-details';
import { MAX_NAME_LENGTH } from './form-fields';
import { matchParticipants } from './matching';
import type { Exclusion, Participant, RaffleInput } from './raffle';

/** What an agent sends to set up an exchange: names instead of ids, groups as a shorthand. */
export type AgentExchange = {
  names: string[];
  exclusions?: { giver: string; cannotDraw: string }[];
  groups?: string[][];
  occasion?: string;
  date?: string;
  time?: string;
  location?: string;
  theme?: string;
  rules?: string;
  budget?: { kind: (typeof budgetKinds)[number]; currency: string; min?: number; max?: number };
};

const names = {
  type: 'array',
  minItems: 2,
  maxItems: 100,
  items: { type: 'string', minLength: 1, maxLength: MAX_NAME_LENGTH },
  description: 'Everyone taking part, one name each. Names must be distinct.',
};
const rules = {
  exclusions: {
    type: 'array',
    description: 'One-way rules: `giver` must not draw `cannotDraw`. Use names from `names`.',
    items: {
      type: 'object',
      properties: { giver: { type: 'string' }, cannotDraw: { type: 'string' } },
      required: ['giver', 'cannotDraw'],
      additionalProperties: false,
    },
  },
  groups: {
    type: 'array',
    description: 'Groups (a couple, siblings) whose members must not draw each other, both ways.',
    items: { type: 'array', minItems: 2, items: { type: 'string' } },
  },
};

export const checkDrawSchema = {
  type: 'object',
  properties: { names, ...rules },
  required: ['names'],
  additionalProperties: false,
};

export const createExchangeSchema = {
  type: 'object',
  properties: {
    names,
    ...rules,
    occasion: {
      type: 'string',
      maxLength: 120,
      description: 'What the exchange is for; it also names the exchange.',
    },
    date: {
      type: 'string',
      format: 'date',
      description: 'Meeting day, YYYY-MM-DD, not in the past.',
    },
    time: {
      type: 'string',
      pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
      description: 'Meeting time, HH:MM.',
    },
    location: { type: 'string', maxLength: 120 },
    theme: { type: 'string', maxLength: 240, description: 'Gift theme.' },
    rules: { type: 'string', maxLength: 5000, description: 'Anything else agreed, free text.' },
    budget: {
      type: 'object',
      description:
        'Gift price. range: min and max; max: up to max; min: from min; about: around max.',
      properties: {
        kind: { enum: [...budgetKinds] },
        currency: { type: 'string', pattern: '^[A-Z]{3}$', description: 'ISO 4217, e.g. BRL.' },
        min: { type: 'number', minimum: 0 },
        max: { type: 'number', minimum: 0 },
      },
      required: ['kind', 'currency'],
      additionalProperties: false,
    },
  },
  required: ['names'],
  additionalProperties: false,
};

const key = (name: string) => name.trim().normalize('NFKC').toLocaleLowerCase('pt-BR');

/** People and exclusions by id, or the first name that doesn't match anyone on the list. */
export function resolveRules(
  input: Pick<AgentExchange, 'names' | 'exclusions' | 'groups'>,
  newId: () => string,
): { participants: Participant[]; exclusions: Exclusion[] } | { unknownName: string } {
  const participants = input.names.map((name) => ({ id: newId(), name: name.trim() }));
  const byName = new Map(participants.map((p) => [key(p.name), p.id]));
  const pairs = [
    ...(input.exclusions ?? []).map((e) => [e.giver, e.cannotDraw] as const),
    ...(input.groups ?? []).flatMap((group) =>
      group.flatMap((a) => group.filter((b) => b !== a).map((b) => [a, b] as const)),
    ),
  ];
  const exclusions = new Map<string, Exclusion>();
  for (const [giver, recipient] of pairs) {
    const from = byName.get(key(giver)),
      to = byName.get(key(recipient));
    if (!from) return { unknownName: giver };
    if (!to) return { unknownName: recipient };
    if (from !== to) exclusions.set(`${from}:${to}`, { from, to });
  }
  return { participants, exclusions: [...exclusions.values()] };
}

/** Whether a draw can satisfy every rule, and if not, who would be left without a name. */
export function checkDraw(input: Pick<AgentExchange, 'names' | 'exclusions' | 'groups'>) {
  let next = 0;
  const resolved = resolveRules(input, () => String(next++));
  if ('unknownName' in resolved)
    return { possible: false, problem: `"${resolved.unknownName}" is not one of the names.` };
  const result = matchParticipants(resolved.participants, resolved.exclusions);
  if (result.ok) return { possible: true };
  const nameOf = new Map(resolved.participants.map((p) => [p.id, p.name]));
  return {
    possible: false,
    problem: 'These people can only draw from too few others, so someone would be left out.',
    givers: result.givers.map((id) => nameOf.get(id)),
    canOnlyDraw: result.recipients.map((id) => nameOf.get(id)),
  };
}

const amount = (value: number | undefined) =>
  value === undefined ? '' : String(Math.round(value * 100) / 100);

/** The form's own input for an agent's exchange; the server validates it like any other. */
export function toRaffleInput(
  input: AgentExchange,
  newId: () => string,
): RaffleInput | { unknownName: string } {
  const resolved = resolveRules(input, newId);
  if ('unknownName' in resolved) return resolved;
  const budget = input.budget;
  const details: ExchangeDetails = {
    ...emptyDetails,
    occasion: input.occasion ?? '',
    date: input.date ?? '',
    time: input.time ?? '',
    location: input.location ?? '',
    theme: input.theme ?? '',
    currency: budget?.currency ?? '',
    budgetKind: budget?.kind ?? 'range',
    budget: budget?.kind === 'min' ? '' : amount(budget?.max),
    ...(budget?.kind === 'range' || budget?.kind === 'min'
      ? { budgetMin: amount(budget.min) }
      : {}),
  };
  return {
    title: details.occasion.trim(),
    rules: input.rules ?? '',
    details,
    ...resolved,
  };
}
