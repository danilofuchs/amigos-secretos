import type { ActionState } from '../actions';

/** Storybook's stand-in: saves nothing and answers like a quick server. */
export async function saveRaffle(previous: ActionState, form: FormData): Promise<ActionState> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return {
    success: 'Saved in Storybook; nothing was stored.',
    version: (previous.version ?? 0) + 1,
    ...(typeof form.get('input') === 'string' ? { input: form.get('input') as string } : {}),
  };
}
