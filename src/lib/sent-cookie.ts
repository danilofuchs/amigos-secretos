/** The cookie that remembers which ticket links of a raffle this browser sent; the server reads it too. */
export const sentCookie = (raffleId: string) => `sent-${raffleId}`;
