import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { HiddenName } from './HiddenName';

const meta = {
  title: 'Animations/Secret slip',
  component: HiddenName,
  args: { name: 'Marina' },
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(560px, 92vw)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HiddenName>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The sample on the home page: swipe right to open, left to fold, and fold it again after. */
export const Demo: Story = { args: { demo: true } };

/** A participant's real slip; opening it reports the open once. */
export const Ticket: Story = { args: { openAction: fn(async () => true) } };

export const LongName: Story = { args: { name: 'Maria Eduarda Albuquerque', demo: true } };
