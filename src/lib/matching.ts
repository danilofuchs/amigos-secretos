type Person = { id: string };
type Pair = { from: string; to: string };

export type MatchResult =
  | { ok: true; recipientOf: Map<string, string> }
  /**
   * No valid draw exists. `givers` is a group that, between them, can only draw `recipients`,
   * which has one person fewer than the group: someone in it is always left without a name.
   */
  | { ok: false; givers: string[]; recipients: string[] };

/**
 * Finds a draw where nobody gets themselves or an excluded person, using augmenting paths.
 * `order` shuffles the search so a server draw is random; with no shuffle it is deterministic,
 * which is enough to tell whether a draw is possible.
 */
export function matchParticipants(
  participants: Person[],
  exclusions: Pair[],
  order: <T>(values: T[]) => T[] = (values) => values,
): MatchResult {
  const blocked = new Set(exclusions.map((e) => `${e.from}:${e.to}`));
  const choices = new Map(
    participants.map((p) => [
      p.id,
      order(
        participants
          .filter((q) => q.id !== p.id && !blocked.has(`${p.id}:${q.id}`))
          .map((q) => q.id),
      ),
    ]),
  );
  const giverOf = new Map<string, string>();
  function augment(giver: string, visited: Set<string>, reached: Set<string>): boolean {
    reached.add(giver);
    for (const recipient of choices.get(giver) ?? []) {
      if (visited.has(recipient)) continue;
      visited.add(recipient);
      const previous = giverOf.get(recipient);
      if (!previous || augment(previous, visited, reached)) {
        giverOf.set(recipient, giver);
        return true;
      }
    }
    return false;
  }
  for (const p of order(participants)) {
    const visited = new Set<string>(),
      reached = new Set<string>();
    if (!augment(p.id, visited, reached)) {
      // Everyone whose options all fall inside the same few recipients is in the same bind.
      const givers = participants
        .filter((q) => reached.has(q.id) || choices.get(q.id)!.every((r) => visited.has(r)))
        .map((q) => q.id);
      return { ok: false, givers, recipients: [...visited] };
    }
  }
  return {
    ok: true,
    recipientOf: new Map([...giverOf].map(([recipient, giver]) => [giver, recipient])),
  };
}
