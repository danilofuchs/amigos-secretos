'use client';
import { useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { useI18n } from './I18nContext';
import { HighlightBox } from './HighlightBox';
import type { Locale } from '@/lib/i18n';

type Part = 'day' | 'month' | 'year';
type Segments = Record<Part, string>;
const LENGTH: Record<Part, number> = { day: 2, month: 2, year: 4 };

/** The locale's own field order and separators, e.g. DD/MM/AAAA or MM/DD/YYYY. */
function dateLayout(locale: Locale) {
  const parts = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date(2000, 10, 22));
  const order = parts
    .map((p) => p.type)
    .filter((type): type is Part => type === 'day' || type === 'month' || type === 'year');
  const separator = parts.find((p) => p.type === 'literal')?.value.trim() || '/';
  return { order, separator };
}

function split(value: string): Segments {
  const [year = '', month = '', day = ''] = value.split('-');
  return { year, month, day };
}

function toIso({ year, month, day }: Segments) {
  if (year.length !== 4 || !month || !day) return '';
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : '';
}

/** A date typed as separate day, month and year boxes in the page's language order. */
export function SegmentedDate({
  id,
  value,
  onValue,
  labelledBy,
  disabled = false,
  onIncomplete,
}: {
  /** True while something is typed that isn't a whole, real date yet. */
  onIncomplete?: (incomplete: boolean) => void;
  id: string;
  value: string;
  onValue: (value: string) => void;
  labelledBy: string;
  disabled?: boolean;
}) {
  const { locale, t } = useI18n();
  const { order, separator } = dateLayout(locale);
  const [draft, setDraft] = useState<Segments>(() => split(value));
  const [synced, setSynced] = useState(value);
  if (value !== synced && value !== toIso(draft)) {
    setSynced(value);
    setDraft(split(value));
  }
  const refs = useRef<Partial<Record<Part, HTMLInputElement | null>>>({});
  const labels: Record<Part, string> = {
    day: t('segmentedDate.day', 'Day'),
    month: t('segmentedDate.month', 'Month'),
    year: t('segmentedDate.year', 'Year'),
  };
  const placeholders: Record<Part, string> = {
    day: t('segmentedDate.dayPlaceholder', 'DD'),
    month: t('segmentedDate.monthPlaceholder', 'MM'),
    year: t('segmentedDate.yearPlaceholder', 'YYYY'),
  };

  function update(next: Segments) {
    setDraft(next);
    const iso = toIso(next);
    onIncomplete?.(!iso && Object.values(next).some(Boolean));
    setSynced(iso);
    if (iso !== value) onValue(iso);
  }
  function focusAt(index: number) {
    const part = order[index];
    if (part) requestAnimationFrame(() => refs.current[part]?.select());
  }
  function type(part: Part, raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, LENGTH[part]);
    update({ ...draft, [part]: digits });
    const full =
      digits.length === LENGTH[part] ||
      (part === 'day' && Number(digits) > 3) ||
      (part === 'month' && Number(digits) > 1);
    if (full) focusAt(order.indexOf(part) + 1);
  }
  function keys(part: Part, event: KeyboardEvent<HTMLInputElement>) {
    const index = order.indexOf(part);
    if (event.key === 'Backspace' && !draft[part]) {
      event.preventDefault();
      focusAt(index - 1);
    } else if ((event.key === separator || event.key === '/' || event.key === '-') && draft[part]) {
      event.preventDefault();
      focusAt(index + 1);
    }
  }
  function paste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text').trim();
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
    const numbers = text.split(/\D+/).filter(Boolean);
    let next: Segments | null = null;
    if (iso) next = { year: iso[1]!, month: iso[2]!, day: iso[3]! };
    else if (numbers.length === 3)
      next = Object.fromEntries(order.map((part, i) => [part, numbers[i]!])) as Segments;
    if (!next) return;
    event.preventDefault();
    update(next);
  }

  return (
    <HighlightBox className="segmented-date">
      <fieldset aria-labelledby={labelledBy} className="segmented-date-parts">
        {order.map((part, index) => (
          <span key={part} className="segmented-date-part">
            {index > 0 && (
              <span className="segmented-date-separator" aria-hidden="true">
                {separator}
              </span>
            )}
            <input
              ref={(element) => {
                refs.current[part] = element;
              }}
              id={index === 0 ? id : undefined}
              className={`written-input segment-${part}`}
              inputMode="numeric"
              autoComplete="off"
              aria-label={labels[part]}
              placeholder={placeholders[part]}
              style={{
                width: `${Math.max(LENGTH[part], placeholders[part].length) * 0.72 + 0.3}em`,
              }}
              maxLength={LENGTH[part]}
              disabled={disabled}
              value={draft[part]}
              onChange={(e) => type(part, e.target.value)}
              onKeyDown={(e) => keys(part, e)}
              onPaste={paste}
              onFocus={(e) => e.currentTarget.select()}
            />
          </span>
        ))}
      </fieldset>
    </HighlightBox>
  );
}
