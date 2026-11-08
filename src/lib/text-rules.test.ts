import { expect, test } from 'vitest';
import { cleanNames, cleanText, isCleanName } from './text-rules';

test('fields drop invisible and direction characters, inputs also drop line breaks', () => {
  expect(cleanText('Ana​ Clara‮', false)).toBe('Ana Clara');
  expect(cleanText('first\nsecond\tline', true)).toBe('first\nsecond line');
  expect(cleanText('first\nsecond', false)).toBe('first second');
});

test('names keep letters in any script, real-name punctuation and emoji', () => {
  expect(cleanNames("Zoë O'Brien-Søren\nJosé (Zé), 李雷; Vó 👵🏽\nTia 👨‍👩‍👧")).toBe(
    "Zoë O'Brien-Søren\nJosé (Zé), 李雷; Vó 👵🏽\nTia 👨‍👩‍👧",
  );
  expect(cleanNames('*Ana* <b>_Bia_</b> ~Caio~')).toBe('Ana bBiab Caio');
  expect(isCleanName('Ana Clara')).toBe(true);
  expect(isCleanName('Ana, Bia')).toBe(false);
  expect(isCleanName('Ana‍‮')).toBe(false);
});
