import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { DrawCeremony } from './DrawCeremony';

/** The full-screen basket that follows the page tearing off; replays from the button. */
function Ceremony({ names, onDone }: { names: string[]; onDone: () => void }) {
  const [run, setRun] = useState(0);
  return (
    <>
      <button type="button" className="button" onClick={() => setRun((n) => n + 1)}>
        Play again
      </button>
      <DrawCeremony key={run} names={names} onDone={onDone} />
    </>
  );
}

const meta = {
  title: 'Animations/Draw ceremony',
  component: Ceremony,
  args: { names: ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabi'], onDone: fn() },
} satisfies Meta<typeof Ceremony>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
