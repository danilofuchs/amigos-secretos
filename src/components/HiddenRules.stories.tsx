import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { emptyDetails, withDetailDefaults } from '@/lib/exchange-details';
import { draft } from '@/stories/fixtures';
import { HiddenRules } from './HiddenRules';

const meta = {
  title: 'Slip/Agreed details',
  component: HiddenRules,
  args: { rules: draft.rules, details: withDetailDefaults(draft.details ?? {}) },
  decorators: [
    (Story) => (
      <main className="page-shell">
        <Story />
      </main>
    ),
  ],
} satisfies Meta<typeof HiddenRules>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Everything: Story = {};
export const NothingAgreed: Story = { args: { rules: '', details: emptyDetails } };
