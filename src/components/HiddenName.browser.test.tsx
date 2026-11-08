import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { HiddenName } from './HiddenName';

test('opens both folds in WebGL before exposing a selectable, focused name', async () => {
  const openAction = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
  const screen = await render(<HiddenName name="Carla" openAction={openAction} />);
  await expect
    .poll(() => document.querySelector('.strip-scene')?.getAttribute('data-mode'))
    .toBe('paper');
  await expect.element(screen.getByRole('heading', { name: 'Carla' })).not.toBeInTheDocument();
  await screen.getByRole('button', { name: 'Abrir dobra 1 de 2' }).click();
  await expect.element(screen.getByText('Abra a última dobra.')).toBeVisible();
  await expect.element(screen.getByRole('heading', { name: 'Carla' })).not.toBeInTheDocument();
  await screen.getByRole('button', { name: 'Abrir dobra 2 de 2' }).click();
  const name = screen.getByRole('heading', { name: 'Carla' });
  await expect.element(name).toBeVisible();
  await expect.element(name).toHaveFocus();
  expect(openAction).toHaveBeenCalledTimes(1);
});
