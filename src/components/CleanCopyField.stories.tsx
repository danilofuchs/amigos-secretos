import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { CleanCopyField } from './CleanCopyField';

/** Typing writes in pencil; leaving the field inks a clean copy in pen over a fading draft. */
function Field({
  as,
  initial,
  placeholder,
}: {
  as: 'input' | 'textarea';
  initial: string;
  placeholder: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ maxWidth: 560 }}>
      <div className="notebook" style={{ padding: 24 }}>
        <label className="notebook-field" htmlFor={`story-${as}`}>
          <span>Campo de exemplo</span>
          <CleanCopyField
            as={as}
            id={`story-${as}`}
            className="written-input"
            value={value}
            onValue={setValue}
            placeholder={placeholder}
            {...(as === 'textarea' ? { rows: 4, growByLine: true } : {})}
          />
        </label>
      </div>
      <button type="button" className="button secondary small" style={{ marginTop: 24 }}>
        Click here to leave the field
      </button>
    </div>
  );
}

const meta = {
  title: 'Animations/Pencil to pen',
  component: Field,
  args: { as: 'input', initial: '', placeholder: 'Escreva algo e saia do campo' },
} satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SingleLine: Story = {};
export const AlreadyInked: Story = { args: { initial: 'Casa da vó' } };
export const Paragraph: Story = {
  args: { as: 'textarea', initial: '', placeholder: 'Algum combinado extra?' },
};
