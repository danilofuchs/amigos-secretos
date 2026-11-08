'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cleanText } from '@/lib/text-rules';
import type {
  ChangeEvent,
  CSSProperties,
  InputHTMLAttributes,
  KeyboardEvent,
  TextareaHTMLAttributes,
} from 'react';
import styles from './CleanCopyField.module.css';
import { HighlightBox } from './HighlightBox';

type FieldElement = HTMLInputElement | HTMLTextAreaElement;
type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange' | 'onBlur' | 'onFocus' | 'className' | 'children'
>;
type Props = NativeProps & {
  as?: 'input' | 'textarea';
  value: string;
  onValue: (value: string) => void;
  className?: string;
  /** Leaving the field traces the pencil draft over in pen. */
  penOnBlur?: boolean;
  /** A textarea grows one ruled line at a time instead of scrolling. */
  growByLine?: boolean;
  extraLineOnGrow?: boolean;
  onLeave?: (value: string) => void;
  /** Narrows what can be typed; by default only invisible characters (and, in an input, line breaks) are dropped. */
  clean?: (text: string) => string;
  /** Tab on a written line moves to the next line, adding one after the last; Tab on an empty line leaves the field. */
  tabToNextLine?: boolean;
};

const PEN_SPEED = 320;
const MIN_LINE_MS = 380;
const PEN_LIFT_MS = 140;
const MAX_TOTAL_MS = 4200;
const FEATHER = 18;
const COPIED_STYLES = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'wordSpacing',
  'textIndent',
  'textAlign',
  'tabSize',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
] as const;

/** Where a copy must sit, and how its text must be set, to land exactly on the field's text. */
function layoutOf(field: HTMLElement) {
  const style = getComputedStyle(field);
  const layout: Partial<
    Record<(typeof COPIED_STYLES)[number] | 'left' | 'top' | 'width' | 'height', string>
  > = {};
  for (const key of COPIED_STYLES) layout[key] = style[key];
  layout.left = `${field.offsetLeft}px`;
  layout.top = `${field.offsetTop}px`;
  layout.width = `${field.clientWidth + field.clientLeft * 2}px`;
  layout.height = `${field.offsetHeight}px`;
  return layout;
}
type CopyLayout = ReturnType<typeof layoutOf>;

type Line = { top: number; height: number; left: number; width: number };

/** No two clean copies are identical: a tiny tilt, baseline shift and spacing per writing. */
function handVariation(seed: number): CSSProperties {
  const noise = (n: number) => {
    const v = Math.sin(seed * 78.233 + n * 12.9898) * 43758.5453;
    return v - Math.floor(v) - 0.5;
  };
  return {
    '--pen-tilt': `${(noise(1) * 0.7).toFixed(2)}deg`,
    '--pen-shift': `${(noise(2) * 1).toFixed(2)}px`,
    '--pen-spacing': `${(0.01 + noise(3) * 0.02).toFixed(3)}em`,
  } as CSSProperties;
}
const seedOf = (text: string) => {
  let seed = 7;
  for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) % 9973;
  return seed;
};

function lineBoxes(copy: HTMLElement): Line[] {
  const text = copy.firstChild;
  if (!text) return [];
  const range = document.createRange();
  range.selectNodeContents(text);
  const origin = copy.getBoundingClientRect();
  const lines: Line[] = [];
  for (const rect of range.getClientRects()) {
    if (rect.width < 1) continue;
    const top = rect.top - origin.top,
      last = lines.at(-1);
    if (last && Math.abs(last.top - top) < rect.height / 2) {
      const right = Math.max(last.left + last.width, rect.right - origin.left);
      last.left = Math.min(last.left, rect.left - origin.left);
      last.width = right - last.left;
    } else
      lines.push({ top, height: rect.height, left: rect.left - origin.left, width: rect.width });
  }
  return lines;
}

export function CleanCopyField({
  as = 'input',
  value,
  onValue,
  className = '',
  penOnBlur = true,
  growByLine = false,
  extraLineOnGrow = true,
  onLeave,
  tabToNextLine = false,
  clean = (text) => cleanText(text, as === 'textarea'),
  ...native
}: Props) {
  const [pen, setPen] = useState(() => penOnBlur && value.trim() !== '');
  const [copying, setCopying] = useState(false);
  const [hand, setHand] = useState(() => handVariation(seedOf(String(native.id ?? '') + value)));
  // The pencil draft left behind once the clean copy is written over it, faintly erased.
  const [ghost, setGhost] = useState<string | null>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const pencilLayout = useRef<CopyLayout>({});
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const fieldRef = useRef<FieldElement>(null);
  const copyRef = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const minHeight = useRef(0);
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!growByLine || !field) return;
    const fit = () => {
      const current = field.style.height;
      field.style.transition = 'none';
      field.style.height = '';
      minHeight.current = field.offsetHeight;
      const line = parseFloat(getComputedStyle(field).lineHeight);
      const needed = field.scrollHeight + field.offsetHeight - field.clientHeight;
      const height = Math.max(
        minHeight.current,
        minHeight.current +
          Math.ceil((needed + (extraLineOnGrow ? line : 0) - minHeight.current) / line) * line,
      );
      field.style.height = current;
      void field.offsetHeight;
      field.style.transition = '';
      field.style.height = `${height}px`;
    };
    fit();
    const observer = new ResizeObserver(() => {
      if (field.clientWidth !== lastWidth) {
        lastWidth = field.clientWidth;
        fit();
      }
    });
    let lastWidth = field.clientWidth;
    observer.observe(field);
    return () => observer.disconnect();
  }, [growByLine, value, extraLineOnGrow]);

  useEffect(() => {
    const field = fieldRef.current,
      copy = copyRef.current;
    if (!copying || !field || !copy) return;
    const layout = layoutOf(field);
    pencilLayout.current = layout;
    Object.assign(copy.style, layout);
    const text = copy.firstElementChild as HTMLElement;
    text.style.transform = `translate(${-field.scrollLeft}px, ${-field.scrollTop}px)`;
    const lines = lineBoxes(text);
    const durations = lines.map((line) => Math.max(MIN_LINE_MS, (line.width / PEN_SPEED) * 1000));
    const scale = Math.min(1, MAX_TOTAL_MS / durations.reduce((sum, d) => sum + d, 0));
    let start = 0;
    const timeline = durations.map((d) => {
      const span = { start, duration: d * scale };
      start += d * scale + PEN_LIFT_MS;
      return span;
    });
    const began = performance.now();
    function draw(now: number) {
      const elapsed = now - began;
      const mask =
        lines
          .map((line, i) => {
            const timing = timeline[i];
            if (!timing) return '';
            const t = Math.min(1, Math.max(0, (elapsed - timing.start) / timing.duration));
            const edge = line.left - FEATHER + (line.width + FEATHER * 2) * t;
            return `linear-gradient(90deg, #000 ${edge}px, transparent ${edge + FEATHER}px) 0 ${line.top}px / 100% ${line.height}px no-repeat`;
          })
          .join(', ') || 'linear-gradient(transparent, transparent)';
      text.style.mask = mask;
      text.style.setProperty('-webkit-mask', mask);
      if (elapsed < start - PEN_LIFT_MS) frame.current = requestAnimationFrame(draw);
      else {
        setPen(true);
        setCopying(false);
        setGhost(valueRef.current);
      }
    }
    frame.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame.current);
  }, [copying]);

  function finishCopy() {
    if (!copying) return;
    cancelAnimationFrame(frame.current);
    setCopying(false);
    setPen(true);
    setGhost(valueRef.current);
  }

  useLayoutEffect(() => {
    const field = fieldRef.current,
      element = ghostRef.current;
    if (!ghost || !field || !element) return;
    // Laid out as the pencil was, before the pen's letter spacing applied.
    Object.assign(element.style, { ...layoutOf(field), ...pencilLayout.current });
  }, [ghost]);

  function blur() {
    onLeave?.(value);
    if (!penOnBlur || pen || !value.trim()) return;
    setHand(handVariation(Math.floor(Math.random() * 9973)));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPen(true);
    else setCopying(true);
  }

  const shared = {
    ...native,
    ref: (element: FieldElement | null) => {
      fieldRef.current = element;
    },
    value,
    className: `${className} ${styles.field} ${pen ? styles.inked : styles.pencil}`,
    style: { ...native.style, ...hand },
    onFocus: () => finishCopy(),
    onBlur: blur,
    onKeyDown: (event: KeyboardEvent<FieldElement>) => {
      native.onKeyDown?.(event as KeyboardEvent<HTMLInputElement & HTMLTextAreaElement>);
      if (
        !tabToNextLine ||
        event.defaultPrevented ||
        event.key !== 'Tab' ||
        event.shiftKey ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const field = event.currentTarget,
        caret = field.selectionEnd ?? value.length;
      const lineStart = value.lastIndexOf('\n', caret - 1) + 1;
      const lineEnd = value.indexOf('\n', caret) === -1 ? value.length : value.indexOf('\n', caret);
      if (!value.slice(lineStart, lineEnd).trim()) return;
      event.preventDefault();
      const hasNext = lineEnd < value.length;
      const nextEnd = !hasNext
        ? lineEnd + 1
        : value.indexOf('\n', lineEnd + 1) === -1
          ? value.length
          : value.indexOf('\n', lineEnd + 1);
      if (!hasNext) onValue(`${value}\n`);
      requestAnimationFrame(() => field.setSelectionRange(nextEnd, nextEnd));
    },
    onChange: (event: ChangeEvent<FieldElement>) => {
      finishCopy();
      setGhost(null);
      if (!event.target.value.trim()) setPen(false);
      const field = event.target,
        cleaned = clean(field.value);
      if (cleaned !== field.value) {
        const caret = clean(field.value.slice(0, field.selectionEnd ?? field.value.length)).length;
        requestAnimationFrame(() => field.setSelectionRange(caret, caret));
      }
      onValue(cleaned);
    },
  };

  return (
    <HighlightBox className={styles.wrap}>
      {ghost && pen && (
        <span
          ref={ghostRef}
          className={styles.ghost}
          aria-hidden="true"
          onAnimationEnd={() => setGhost(null)}
        >
          <span className={as === 'textarea' ? styles.wrapLines : styles.oneLine}>{ghost}</span>
        </span>
      )}
      {as === 'textarea' ? <textarea {...shared} /> : <input {...shared} />}
      {copying && (
        <span ref={copyRef} className={styles.copy} style={hand} aria-hidden="true">
          <span className={`${styles.ink} ${as === 'textarea' ? styles.wrapLines : ''}`}>
            {value}
          </span>
        </span>
      )}
    </HighlightBox>
  );
}
