import type { Raffle } from '@/lib/raffle';
import { emptyDetails } from '@/lib/exchange-details';

const names = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabi', 'Heitor'];
export const participants = names.map((name, i) => ({ id: `p${i}`, name }));

/** A family exchange as an organizer would set it up: a couple and a pair of siblings kept apart. */
export const draft: Raffle = {
  id: 'storybook',
  title: 'Natal da família',
  rules: 'Embrulho caprichado. Nada de vale-presente.',
  details: {
    ...emptyDetails,
    occasion: 'Natal da família',
    date: '2099-12-24',
    time: '19:30',
    location: 'Casa da vó',
    theme: 'Algo feito à mão',
    currency: 'BRL',
    budgetKind: 'range',
    budgetMin: '80',
    budget: '150',
  },
  participants,
  exclusions: [
    { from: 'p0', to: 'p1' },
    { from: 'p1', to: 'p0' },
    { from: 'p2', to: 'p4' },
  ],
  status: 'draft',
  createdAt: '2026-11-01T12:00:00.000Z',
  version: 1,
  tickets: [],
};

export const drawn: Raffle = {
  ...draft,
  status: 'drawn',
  version: 2,
  drawId: 'draw-1',
  tickets: participants.map((p, i) => ({
    name: p.name,
    code: `STORYBOOK${String(i).padStart(3, '0')}`,
    participantId: p.id,
  })),
};

export const archived: Raffle = { ...drawn, status: 'archived', version: 3 };
