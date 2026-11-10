import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { archived, draft, drawn } from '@/stories/fixtures';
import { RaffleForm } from './RaffleForm';

/**
 * The organizer's notebook. Saving and drawing go to a stand-in server that stores nothing, so
 * the page rip, the basket and the slips can be replayed as often as needed.
 */
const meta = {
  title: 'Forms/Exchange notebook',
  component: RaffleForm,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <main className="page-shell">
        <Story />
      </main>
    ),
  ],
} satisfies Meta<typeof RaffleForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NewExchange: Story = {};
export const Draft: Story = { args: { raffle: draft } };
export const Drawn: Story = { args: { raffle: drawn, canRedraw: true } };
export const DrawnAndOpened: Story = { args: { raffle: drawn, canRedraw: false } };
export const Archived: Story = { args: { raffle: archived } };
