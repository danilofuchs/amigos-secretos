import { expect, test } from 'vitest';
import { defaultCurrency, negotiateLocale, shareMessage, translator } from './i18n';
import { validateInput, ValidationError } from './raffle';
import { emptyDetails } from './exchange-details';

test('explicit language wins; browser preferences honor quality and supported regional variants', () => {
  expect(negotiateLocale('es', 'en-US')).toBe('es');
  expect(negotiateLocale(undefined, 'fr,es-MX;q=0.9,en;q=0.7')).toBe('es');
  expect(negotiateLocale(undefined, 'en;q=0,pt-PT;q=0.8')).toBe('pt-BR');
  expect(negotiateLocale('unknown', 'de')).toBe('pt-BR');
});
test('all languages interpolate labels and keep user names unchanged', () => {
  const copy = ['shareTickets.copyMessageFor', 'Copy message for {name}'] as const;
  expect(translator('en')(...copy, { name: 'João' })).toBe('Copy message for João');
  expect(translator('pt-BR')(...copy, { name: 'João' })).toBe('Copiar mensagem de João');
  expect(translator('es')('hiddenName.openFold2', 'Open fold {n} of 2', { n: 2 })).toBe(
    'Abrir pliegue 2 de 2',
  );
});
test('messages agree in number with how many people they name', () => {
  const message = ['validation.drawNobodyLeft', '{givers} cannot draw anyone.'] as const;
  expect(translator('pt-BR')(...message, { givers: 'Ana', count: 1 })).toBe(
    'Ana não pode tirar ninguém.',
  );
  expect(translator('pt-BR')(...message, { givers: 'Oi, Tchau e Dois', count: 3 })).toBe(
    'Oi, Tchau e Dois não podem tirar ninguém.',
  );
  expect(translator('es')(...message, { givers: 'Ana y Bruno', count: 2 })).toBe(
    'Ana y Bruno no pueden sacar a nadie.',
  );
});
test('a missing translation falls back to the English default', () => {
  expect(translator('es')('nowhere.missing', 'Only in English')).toBe('Only in English');
});
test('share messages preserve the same private code and distinguish giver from recipient', () => {
  const url = 'https://example.com/aB0123456789';
  for (const locale of ['pt-BR', 'en', 'es'] as const)
    expect(shareMessage(locale, 'João', 'Festa', url)).toContain(url);
  expect(shareMessage('en', 'João', 'Festa', url)).toContain("who you're buying a gift for");
});
test('occasion and currency are independent of language; invalid dates and budgets are rejected', () => {
  const input = {
    title: 'Reunião',
    rules: 'Bring a book',
    participants: [
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Bruno' },
    ],
    exclusions: [],
    details: {
      ...emptyDetails,
      occasion: 'Birthday',
      date: '2027-03-14',
      currency: 'JPY',
      budget: '1000',
      budgetMin: '500',
    },
  };
  expect(
    validateInput({ ...input, details: { ...input.details, budgetMin: '2000' } }).details,
  ).toMatchObject({ budgetMin: '1000', budget: '2000' });
  expect(() => validateInput({ ...input, details: { ...input.details, budget: '-5' } })).toThrow(
    ValidationError,
  );
  expect(validateInput(input).details).toEqual(input.details);
  expect(() =>
    validateInput({ ...input, details: { ...input.details, date: '2027-02-30' } }),
  ).toThrow(ValidationError);
  expect(() => validateInput({ ...input, details: { ...input.details, currency: '' } })).toThrow(
    ValidationError,
  );
});

test('currency defaults use the matching regional locale and remain overridable', () => {
  expect(defaultCurrency('pt-BR')).toBe('BRL');
  expect(defaultCurrency('en', 'en-GB,en;q=.8')).toBe('GBP');
  expect(defaultCurrency('es', 'es-MX,es;q=.8')).toBe('MXN');
  expect(defaultCurrency('es', 'en-US')).toBe('EUR');
});

const MESSAGE_ID = /^[a-z][A-Za-z]*(\.[A-Za-z0-9]+)+$/;
/** Every message the code uses, read from `t('id', 'English default', …)` calls. */
async function usedMessages() {
  const { readFileSync, readdirSync } = await import('node:fs');
  const ts = await import('typescript');
  const used = new Map<string, Set<string>>();
  const files = readdirSync('src', { recursive: true, encoding: 'utf8' }).filter(
    (name) => /\.tsx?$/.test(name) && !name.includes('.test.'),
  );
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      readFileSync(`src/${file}`, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node: import('typescript').Node) => {
      const parts =
        ts.isCallExpression(node) || ts.isNewExpression(node)
          ? node.arguments
          : ts.isArrayLiteralExpression(node)
            ? node.elements
            : undefined;
      const [id, message] = parts ?? [];
      if (
        id &&
        message &&
        ts.isStringLiteral(id) &&
        MESSAGE_ID.test(id.text) &&
        (ts.isStringLiteral(message) || ts.isNoSubstitutionTemplateLiteral(message))
      )
        used.set(id.text, (used.get(id.text) ?? new Set()).add(message.text));
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return used;
}

test('ids are stable and every locale file matches the messages the code uses', async () => {
  const { default: IntlMessageFormat } = await import('intl-messageformat');
  const used = await usedMessages();
  const conflicting = [...used].filter(([, defaults]) => defaults.size > 1).map(([id]) => id);
  expect(conflicting).toEqual([]);
  for (const [locale, file] of [
    ['pt-BR', await import('./i18n/messages/pt-BR.json')],
    ['es', await import('./i18n/messages/es.json')],
  ] as const) {
    const messages = file.default as Record<string, string>;
    expect({ locale, missing: [...used.keys()].filter((id) => !(id in messages)) }).toEqual({
      locale,
      missing: [],
    });
    expect({ locale, unused: Object.keys(messages).filter((id) => !used.has(id)) }).toEqual({
      locale,
      unused: [],
    });
    for (const message of Object.values(messages))
      expect(() => new IntlMessageFormat(message, locale)).not.toThrow();
  }
  for (const defaults of used.values())
    for (const message of defaults)
      expect(() => new IntlMessageFormat(message, 'en')).not.toThrow();
});
