/** Storybook's stand-ins for the agent tools. */
export async function listExchangesForAgent() {
  return { exchanges: [] };
}
export async function createExchangeForAgent() {
  return { error: 'Not available in Storybook.' };
}
export async function ticketLinksForAgent() {
  return { error: 'Not available in Storybook.' };
}
