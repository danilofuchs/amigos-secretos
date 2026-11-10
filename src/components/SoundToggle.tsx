'use client';
import { useSyncExternalStore } from 'react';
import { useI18n } from '@/components/I18nContext';
import { isMuted, setMuted, subscribeMuted } from '@/lib/sounds';
import { Icon } from './Icon';

export function SoundToggle() {
  const { t } = useI18n();
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  return (
    <button
      type="button"
      className="text-link sound-toggle"
      aria-pressed={!muted}
      onClick={() => setMuted(!muted)}
    >
      <Icon name={muted ? 'sound-off' : 'sound'} />
      {t('soundToggle.sounds', 'Sounds')}
    </button>
  );
}
