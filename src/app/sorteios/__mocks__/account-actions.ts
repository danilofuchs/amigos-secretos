/** Storybook's stand-ins: nobody signs in. */
export async function finishGoogleSignIn(): Promise<{ ok: boolean }> {
  return { ok: false };
}
export async function signOut(): Promise<void> {}
