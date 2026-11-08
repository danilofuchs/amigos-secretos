import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ShareTickets } from './ShareTickets';

const ticket = { name: 'Ana', code: '8BZn3yXTfAd6' };

test('copies the private link and confirms inside the same button', async () => {
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const screen = await render(<ShareTickets title="Turma" tickets={[ticket]} />);
  await screen.getByRole('button', { name: 'Copiar mensagem de Ana' }).click();
  await expect
    .element(screen.getByRole('button', { name: 'Mensagem de Ana copiada' }))
    .toBeVisible();
  expect(write).toHaveBeenCalledWith(expect.stringContaining(`/${ticket.code}`));
  expect(write).toHaveBeenCalledWith(expect.stringContaining('Oi, Ana!'));
});

test('offers selectable text when clipboard access fails', async () => {
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Permission denied'));
  const screen = await render(<ShareTickets title="Turma" tickets={[ticket]} />);
  await screen.getByRole('button', { name: 'Copiar mensagem de Ana' }).click();
  await expect
    .element(screen.getByRole('textbox', { name: 'Mensagem para copiar' }))
    .toHaveValue(expect.stringContaining(`/${ticket.code}`));
  await expect
    .element(screen.getByRole('button', { name: 'Copiar mensagem de Ana' }))
    .toBeEnabled();
});
