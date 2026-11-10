import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { emptyDetails } from '@/lib/exchange-details';
import { participants } from '@/stories/fixtures';
import { BudgetSentence } from './BudgetSentence';
import { GroupPicker } from './GroupPicker';
import { SegmentedDate } from './SegmentedDate';

function Fields() {
  const [budget, setBudget] = useState({
    ...emptyDetails,
    currency: 'BRL',
    budgetMin: '80',
    budget: '150',
  });
  const [date, setDate] = useState('');
  const [group, setGroup] = useState<string[]>([]);
  return (
    <div className="notebook" style={{ maxWidth: 640, padding: 24, display: 'grid', gap: 40 }}>
      <BudgetSentence value={budget} onValue={(next) => setBudget((d) => ({ ...d, ...next }))} />
      <div>
        <span id="story-date-label">Data do encontro</span>
        <SegmentedDate
          id="story-date"
          labelledBy="story-date-label"
          value={date}
          onValue={setDate}
        />
      </div>
      <GroupPicker
        people={participants}
        value={group}
        onValue={setGroup}
        placeholder="Quem fica no mesmo grupo?"
        label="Pessoas no grupo"
      />
    </div>
  );
}

const meta = { title: 'Forms/Fields', component: Fields } satisfies Meta<typeof Fields>;
export default meta;

/** The budget sentence, the date in pieces and the group picker, each on its own. */
export const Default: StoryObj<typeof meta> = {};
