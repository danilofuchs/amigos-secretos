import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { LanguageContext } from './I18nContext';
import { ShareTickets } from './ShareTickets';
import { HiddenRules } from './HiddenRules';

test('message language changes independently of the interface', async () => {
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const screen = await render(
    <LanguageContext value={{ locale: 'en' }}>
      <ShareTickets title="Festa da turma" tickets={[{ name: 'João', code: 'aB0123456789' }]} />
    </LanguageContext>,
  );
  await screen.getByRole('combobox', { name: 'Message language' }).selectOptions('es');
  await screen.getByRole('button', { name: 'Copy message for João' }).click();
  expect(write).toHaveBeenCalledWith(expect.stringContaining('¡Hola, João!'));
  expect(write).toHaveBeenCalledWith(expect.stringContaining('/aB0123456789'));
  await expect.element(screen.getByRole('heading', { name: 'Send the slips.' })).toBeVisible();
  await expect
    .element(screen.getByRole('button', { name: 'Message for João copied' }))
    .toBeVisible();
});
test('formats event information without translating organizer content or changing the currency', async () => {
  const screen = await render(
    <LanguageContext value={{ locale: 'es' }}>
      <HiddenRules
        rules="Bring your favourite book"
        details={{
          occasion: 'Festa da turma',
          date: '2027-03-14',
          time: '19:30',
          location: 'Casa da Ana',
          currency: 'USD',
          budget: '25',
          budgetKind: 'max',
          theme: 'Livros',
        }}
      />
    </LanguageContext>,
  );
  await expect.element(screen.getByRole('heading', { name: 'Lo que acordamos' })).toBeVisible();
  await expect.element(screen.getByText('Bring your favourite book')).toBeVisible();
  await expect
    .element(
      screen.getByText(
        new Intl.DateTimeFormat('es', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'UTC',
        }).format(new Date('2027-03-14T19:30:00Z')),
      ),
    )
    .toBeVisible();
  await expect.element(screen.getByText('Casa da Ana')).toBeVisible();
  await expect
    .element(
      screen.getByText(
        `hasta ${new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' }).format(25)}`,
      ),
    )
    .toBeVisible();
});
