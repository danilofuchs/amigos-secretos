import { expect, test, vi } from 'vitest';
import { playSound, setMuted } from '@/lib/sounds';

test('plays a sound file on cue, and stays quiet when muted', async () => {
  // Records each real start without replacing it, so stopping behaves exactly as in the app.
  const start = vi.spyOn(AudioBufferSourceNode.prototype, 'start');
  const starts = start.mock.contexts as AudioBufferSourceNode[];
  setMuted(false);
  playSound('tear');
  playSound('shuffle', { delay: 0.1, rate: 0.9 });
  await vi.waitFor(() => expect(starts).toHaveLength(2), { timeout: 5000 });
  expect(starts.every((node) => (node.buffer?.duration ?? 0) > 0.3)).toBe(true);
  // A sound with a set length, stopped early, as a field does when it is reopened mid-stroke.
  const stop = playSound('pen', { duration: 0.4 });
  await vi.waitFor(() => expect(starts).toHaveLength(3), { timeout: 5000 });
  expect(() => stop()).not.toThrow();
  playSound('pencil', { from: 0.18, duration: 0.09 })();
  setMuted(true);
  playSound('tear');
  await new Promise((r) => setTimeout(r, 300));
  expect(starts).toHaveLength(3);
  setMuted(false);
  start.mockRestore();
});
