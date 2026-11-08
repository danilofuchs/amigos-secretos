/**
 * Characters a typed field keeps. Invisible and direction-changing characters can make two
 * names look identical or flip the text around them, so no field accepts them.
 */
const INVISIBLE = /(?!\n)\p{Cc}|(?!‍)\p{Cf}/gu;
const TAB = /\t/g;

/** Letters in any script, numbers, the punctuation real names use, and emoji (with their joiners and skin tones). */
const NAME_CHARACTER =
  /^(?:[\p{L}\p{N} .'’()-]|\p{M}|\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\u200D)$/u;

/** Drops invisible characters; a single-line field also turns line breaks into spaces. */
export function cleanText(text: string, multiline: boolean) {
  const visible = text.replace(TAB, ' ').replace(INVISIBLE, '');
  return multiline ? visible : visible.replace(/\n/g, ' ');
}

/** The names list keeps only name characters plus the separators between names. */
export function cleanNames(text: string) {
  let kept = '';
  for (const character of cleanText(text, true))
    if (
      character === '\n' ||
      character === ',' ||
      character === ';' ||
      NAME_CHARACTER.test(character)
    )
      kept += character;
  return kept;
}

export const isCleanName = (name: string) => cleanNames(name) === name && !/[\n,;]/.test(name);
export const isCleanText = (text: string, multiline: boolean) =>
  cleanText(text, multiline) === text;
