import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { sentCookie } from '@/lib/sent-cookie';
import { drawn } from '@/stories/fixtures';
import { ShareTickets } from './ShareTickets';

const now = Date.now();
const ago = (hours: number) => new Date(now - hours * 3_600_000).toISOString();

const meta = {
  title: 'Forms/Send slips',
  component: ShareTickets,
  args: {
    raffleId: 'storybook',
    title: drawn.title,
    tickets: drawn.tickets,
  },
  decorators: [
    (Story) => (
      <main className="page-shell">
        <Story />
      </main>
    ),
  ],
} satisfies Meta<typeof ShareTickets>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NothingSent: Story = {
  beforeEach() {
    document.cookie = `${sentCookie('storybook')}=; path=/; max-age=0`;
  },
};

/** One green check once sent, two blue checks once opened, like a chat app. */
export const SomeSentAndOpened: Story = {
  args: {
    opens: { STORYBOOK000: ago(1), STORYBOOK001: ago(26), STORYBOOK004: ago(80) },
  },
  // The browser reads its sent marks from a cookie, scoped here to the whole Storybook.
  beforeEach() {
    document.cookie = `${sentCookie('storybook')}=STORYBOOK002.STORYBOOK003; path=/`;
    return () => {
      document.cookie = `${sentCookie('storybook')}=; path=/; max-age=0`;
    };
  },
};
