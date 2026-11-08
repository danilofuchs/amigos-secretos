/**
 * Stops the reader from scrolling while things fly to fixed screen positions. Input is blocked
 * instead of hiding overflow, which would remove the scrollbar and shift the page under them.
 */
const KEYS = new Set([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown']);
let holders = 0;
const block = (event: Event) => event.preventDefault();
const blockKeys = (event: KeyboardEvent) => {
  const field = (event.target as HTMLElement | null)?.closest?.('input, textarea, select');
  if (KEYS.has(event.key) && !field) event.preventDefault();
};

/** Locks scrolling until the returned function is called; locks from several owners stack. */
export function lockScroll() {
  if (holders++ === 0) {
    window.addEventListener('wheel', block, { passive: false });
    window.addEventListener('touchmove', block, { passive: false });
    window.addEventListener('keydown', blockKeys);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--holders === 0) {
      window.removeEventListener('wheel', block);
      window.removeEventListener('touchmove', block);
      window.removeEventListener('keydown', blockKeys);
    }
  };
}
