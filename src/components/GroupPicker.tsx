'use client';
import { Select } from '@base-ui/react/select';
import { useI18n } from './I18nContext';
import { Icon } from './Icon';

/** Picks several people at once, written back into the sentence as a list of names. */
export function GroupPicker({
  people,
  value,
  onValue,
  placeholder,
  label,
}: {
  people: { id: string; name: string }[];
  value: string[];
  onValue: (value: string[]) => void;
  placeholder: string;
  label: string;
}) {
  const { locale } = useI18n();
  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  return (
    <Select.Root multiple value={value} onValueChange={(next) => onValue([...next])}>
      <Select.Trigger className="group-trigger" aria-label={label}>
        <Select.Value className="group-value">
          {(selected: string[]) =>
            selected.length ? (
              new Intl.ListFormat(locale, { type: 'conjunction' }).format(
                selected.map((id) => nameOf.get(id) ?? ''),
              )
            ) : (
              <span className="group-placeholder">{placeholder}</span>
            )
          }
        </Select.Value>
        <Select.Icon className="group-icon">
          <Icon name="chevron" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} alignItemWithTrigger={false} className="group-positioner">
          <Select.Popup className="paper-popup">
            {people.map((person) => (
              <Select.Item key={person.id} value={person.id} className="paper-option">
                <Select.ItemText>{person.name}</Select.ItemText>
                <Select.ItemIndicator className="paper-check">✓</Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
