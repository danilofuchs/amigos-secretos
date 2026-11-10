import type { Preview } from '@storybook/nextjs-vite';
import { useEffect } from 'react';
import { sb } from 'storybook/test';
import { handwriting, ui } from '../src/app/fonts';
import { LanguageContext } from '../src/components/I18nContext';
import { InkFilter } from '../src/components/InkFilter';
import { dropBasket } from '../src/lib/basket-stage';
import { isLocale, type Locale } from '../src/lib/i18n';
import '../src/app/globals.css';

// Server actions can't run here; each has a stand-in in the __mocks__ folder beside it.
sb.mock(import('../src/app/create/actions.ts'));
sb.mock(import('../src/app/[code]/actions.ts'));
sb.mock(import('../src/app/agent-actions.ts'));
sb.mock(import('../src/app/sorteios/account-actions.ts'));
sb.mock(import('../src/lib/i18n/actions.ts'));

// Set before any story renders: the 3D slip and basket read the handwriting font once, at start.
document.documentElement.classList.add(handwriting.variable, ui.variable);

const preview: Preview = {
  // The draw's basket lives outside the story and waits to be carried onward; nothing here will.
  beforeEach: () => dropBasket,
  parameters: {
    nextjs: { appDirectory: true },
    layout: 'padded',
    controls: { expanded: true },
  },
  globalTypes: {
    locale: {
      description: 'Language',
      toolbar: {
        title: 'Language',
        icon: 'globe',
        dynamicTitle: true,
        items: [
          { value: 'pt-BR', title: 'Português' },
          { value: 'en', title: 'English' },
          { value: 'es', title: 'Español' },
        ],
      },
    },
  },
  initialGlobals: { locale: 'pt-BR' },
  decorators: [
    (Story, { globals }) => {
      const locale: Locale = isLocale(globals.locale) ? globals.locale : 'pt-BR';
      useEffect(() => {
        document.documentElement.lang = locale;
      }, [locale]);
      return (
        <LanguageContext value={{ locale }}>
          <InkFilter />
          <Story />
        </LanguageContext>
      );
    },
  ],
};
export default preview;
