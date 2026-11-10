import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { GoogleAccount } from './GoogleAccount';

const meta = {
  title: 'Forms/Google account',
  component: GoogleAccount,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof GoogleAccount>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Signed out, Google's button only loads on the site's own addresses, so only this state is shown. */
export const SignedIn: Story = { args: { email: 'ana@example.com' } };
