'use client';
import { useI18n } from '@/components/I18nContext';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import type { PaperStrip } from '@/lib/paper-strip-3d';
import type { NameLayout } from '@/lib/paper-texture';
import { FOLDED_MOST, STRIP_ASPECT, stripWidthFor } from '@/lib/paper-fold';
import { Icon } from './Icon';
import { haptic } from '@/lib/haptic';
import { playSound, preloadSounds } from '@/lib/sounds';

/** Each fold is felt and heard; opening rustles a little lower and softer than folding. */
function feelFold(stage: number, folding: boolean) {
  haptic(stage === FOLDED_MOST);
  playSound('fold', {
    rate: (folding ? 1 : 0.85) + Math.random() * 0.12,
    volume: folding ? 0.55 : 0.4,
  });
}

type Mode = 'loading' | 'paper' | 'flat';
type Gesture = {
  pointer: number;
  x: number;
  y: number;
  from: number;
  base: number;
  dragging: boolean;
  direction: number;
  lastTime: number;
  speed: number;
  /** The last fold the drag passed, already felt as a tap. */
  felt: number;
};

const STRIP_TILT = '-1.43deg';

async function handwritingFamily() {
  const family =
    getComputedStyle(document.documentElement).getPropertyValue('--font-handwriting').trim() ||
    'cursive';
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
  await Promise.race([document.fonts.load(`500 64px ${family}`).catch(() => undefined), timeout]);
  return family;
}

const IDLE_MS = 4000;
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function HiddenName({
  name,
  demo = false,
  openAction,
}: {
  name: string;
  demo?: boolean;
  /** Records the open; false means the draw changed since this page loaded. */
  openAction?: () => Promise<boolean>;
}) {
  const { t } = useI18n();
  const instructions = [
    t('hiddenName.pullRightOpen', 'Pull to the right to open.'),
    t('hiddenName.openLastFold', 'Open the last fold.'),
  ];
  const [fold, setFold] = useState(0);
  const [moving, setMoving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mode, setMode] = useState<Mode>('loading');
  const [stripWidth, setStripWidth] = useState(336);
  const [layout, setLayout] = useState<NameLayout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const stripRef = useRef<PaperStrip | null>(null);
  const targetRef = useRef(0);
  const settledRef = useRef(0);
  const gesture = useRef<Gesture | null>(null);
  const ignoreClickUntil = useRef(0);
  const lastTouched = useRef(0);
  const revealed = fold === 2 && !moving;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let strip: PaperStrip | null = null;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setStripWidth(stripWidthFor(entry.contentRect.width));
      strip?.resize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(canvas);
    function settle(stage: number) {
      settledRef.current = stage;
      if (stage !== targetRef.current) return;
      setFold(stage);
      setMoving(false);
      setClosing(false);
    }
    void (async () => {
      try {
        const [{ createPaperStrip }, family] = await Promise.all([
          import('@/lib/paper-strip-3d'),
          handwritingFamily(),
        ]);
        if (cancelled) return;
        const rect = canvas.getBoundingClientRect();
        strip = createPaperStrip(canvas, {
          name,
          fontFamily: family,
          width: rect.width,
          height: rect.height,
          onSettle: settle,
          onContextLost: () => {
            strip?.dispose();
            strip = null;
            stripRef.current = null;
            setMoving(false);
            setMode('flat');
          },
        });
        strip.setProgress(targetRef.current);
        stripRef.current = strip;
        setLayout(strip.layout);
        setMode('paper');
      } catch {
        if (!cancelled) setMode('flat');
      }
    })();
    return () => {
      cancelled = true;
      observer.disconnect();
      strip?.dispose();
      stripRef.current = null;
    };
  }, [name]);

  useEffect(() => {
    if (revealed) headingRef.current?.focus({ preventScroll: true });
  }, [revealed]);
  useEffect(() => preloadSounds('fold'), []);

  // A slip left alone stirs now and then, hinting that it opens.
  useEffect(() => {
    if (mode !== 'paper' || fold >= 2 || moving || prefersReducedMotion()) return;
    lastTouched.current = performance.now();
    let timer: ReturnType<typeof setTimeout>,
      stirs = 0;
    const wait = (ms: number) => {
      timer = setTimeout(stir, ms);
    };
    function stir() {
      const idle = performance.now() - lastTouched.current;
      if (gesture.current || document.hidden || idle < IDLE_MS) {
        wait(IDLE_MS - idle + 50);
        return;
      }
      stripRef.current?.nudge(1.4);
      setTimeout(() => stripRef.current?.nudge(0.9), 260);
      if (++stirs < 3) wait(IDLE_MS * 1.6);
    }
    wait(IDLE_MS);
    return () => clearTimeout(timer);
  }, [mode, fold, moving]);
  const reported = useRef(false);
  function claim() {
    if (reported.current || !openAction) return;
    reported.current = true;
    openAction()
      .then((current) => {
        if (!current) window.location.reload();
      })
      .catch(() => {
        reported.current = false;
      });
  }

  function goTo(stage: number, velocity?: number, felt = targetRef.current) {
    if (stage !== felt) feelFold(stage, stage < felt);
    targetRef.current = stage;
    const strip = stripRef.current;
    if (!strip) {
      settledRef.current = stage;
      setFold(stage);
      setMoving(false);
      setClosing(false);
      return;
    }
    setMoving(true);
    strip.animateTo(stage, {
      ...(velocity === undefined ? {} : { velocity }),
      instant: prefersReducedMotion(),
    });
  }

  function openNext() {
    if (mode === 'loading' || targetRef.current >= 2) return;
    claim();
    goTo(targetRef.current + 1);
  }

  function refold() {
    settledRef.current = 0;
    setFold(0);
    setClosing(true);
    goTo(0);
    requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));
  }

  function startGesture(event: PointerEvent<HTMLDivElement>) {
    const strip = stripRef.current;
    lastTouched.current = performance.now();
    if (!strip || !event.isPrimary || event.button !== 0) return;
    const from = strip.progress;
    gesture.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      from,
      base: targetRef.current,
      dragging: false,
      direction: 1,
      lastTime: event.timeStamp,
      speed: 0,
      felt: targetRef.current,
    };
  }

  function moveGesture(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current,
      strip = stripRef.current;
    if (!g || !strip || g.pointer !== event.pointerId) return;
    const rawDx = event.clientX - g.x,
      dx = Math.abs(rawDx),
      dy = Math.abs(event.clientY - g.y);
    if (!g.dragging) {
      if (dy > 10 && dy > dx) {
        gesture.current = null;
        return;
      }
      if (dx < 8 || dx < dy * 1.2) return;
      g.dragging = true;
      window.getSelection()?.removeAllRanges();
      if (rawDx > 0) claim();
      event.currentTarget.setPointerCapture(event.pointerId);
      setMoving(true);
      setClosing(rawDx < 0);
      g.direction = Math.sign(rawDx);
    }
    // The paper follows the finger across as many folds as it is pulled: rightward opens, leftward folds.
    const quarter = strip.stripWidth / 4;
    // Swipe distance per fold: the extra folds of a closed slip are short, the last unfold long.
    const reach = [quarter * 0.5, quarter * 1.6, quarter * 2.4] as const;
    const travel = (p: number) =>
      p < 0 ? p * reach[0] : Math.min(p, 1) * reach[1] + Math.max(0, p - 1) * reach[2];
    const at = (d: number) =>
      d < 0 ? d / reach[0] : d <= reach[1] ? d / reach[1] : 1 + (d - reach[1]) / reach[2];
    const next = Math.min(2, at(Math.max(FOLDED_MOST * reach[0], travel(g.from) + rawDx)));
    if (next !== strip.progress) g.direction = Math.sign(next - strip.progress);
    const reached = next > strip.progress ? Math.floor(next) : Math.ceil(next);
    if (next > strip.progress ? reached > g.felt : reached < g.felt) {
      feelFold(reached, reached < g.felt);
      g.felt = reached;
    }
    const dt = Math.max(1, event.timeStamp - g.lastTime);
    g.speed = g.speed * 0.6 + ((next - strip.progress) / dt) * 1000 * 0.4;
    g.lastTime = event.timeStamp;
    strip.setProgress(next);
  }

  function endGesture(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const g = gesture.current,
      strip = stripRef.current;
    if (!g || g.pointer !== event.pointerId) return;
    gesture.current = null;
    if (!g.dragging || !strip) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    ignoreClickUntil.current = performance.now() + 350;
    const held = event.timeStamp - g.lastTime;
    const speed = held > 120 ? 0 : g.speed;
    // On release the fold in progress finishes the way the paper was last moving, even after a pause;
    // a hair past a fold counts as resting on it.
    const p = strip.progress;
    const direction = speed > 0.5 ? 1 : speed < -0.5 ? -1 : g.direction;
    const stage = cancelled ? g.base : direction > 0 ? Math.ceil(p - 0.06) : Math.floor(p + 0.06);
    goTo(Math.min(2, Math.max(FOLDED_MOST, stage)), cancelled ? 0 : speed, g.felt);
  }

  const stripHeight = stripWidth / STRIP_ASPECT;
  const nameStyle = layout
    ? ({
        width: stripWidth,
        height: stripHeight,
        fontSize: layout.fontSize * stripWidth,
        paddingTop:
          (layout.baselines[0] - 0.035) * stripHeight - layout.fontSize * stripWidth * 0.78,
        transform: `translate(-50%, -50%) rotate(${STRIP_TILT})`,
      } satisfies CSSProperties)
    : undefined;
  const flatStyle = {
    width: stripWidth / 2 ** (2 - Math.max(-1, fold)),
    height: stripHeight,
    transform: `translate(-50%, -50%) rotate(${STRIP_TILT})`,
  } satisfies CSSProperties;
  const status = moving
    ? closing
      ? ''
      : t('hiddenName.opening', 'Opening…')
    : revealed
      ? demo
        ? t(
            'hiddenName.exampleEveryoneReceivesTheir',
            '{name} is an example. Everyone receives their own slip.',
            { name },
          )
        : t(
            'hiddenName.youreBuyingGiftPerson',
            "You're buying a gift for this person. Keep it secret.",
          )
      : instructions[Math.max(0, fold)];

  return (
    <div className={`paper-ritual ${demo ? 'ritual-demo' : ''}`}>
      {demo && (
        <p className="demo-caption">
          {t('hiddenName.exampleSlipGoAhead', 'An example slip. Go ahead and open it.')}
        </p>
      )}
      {/* The swipe belongs to the whole scene, so the opened name can be folded back too. */}
      <div
        className="strip-scene"
        data-mode={mode}
        onPointerDown={startGesture}
        onPointerMove={moveGesture}
        onPointerUp={(event) => endGesture(event, false)}
        onPointerCancel={(event) => endGesture(event, true)}
      >
        <canvas ref={canvasRef} className="strip-canvas" aria-hidden="true" />
        {mode !== 'paper' && (
          <div className="strip-flat" style={flatStyle} aria-hidden={!revealed}>
            {revealed && (
              <h2 ref={headingRef} tabIndex={-1}>
                {name}
              </h2>
            )}
          </div>
        )}
        {mode === 'paper' && revealed && (
          <div className="strip-name" style={nameStyle}>
            <h2 ref={headingRef} tabIndex={-1}>
              {layout
                ? layout.lines.map((line, i) => (
                    <span key={i}>
                      {i > 0 && ' '}
                      {line}
                    </span>
                  ))
                : name}
            </h2>
          </div>
        )}
        {!revealed && (
          <button
            ref={buttonRef}
            className="strip-hit"
            type="button"
            onClick={() => {
              if (performance.now() < ignoreClickUntil.current) return;
              openNext();
            }}
            aria-label={t('hiddenName.openFold2', 'Open fold {n} of 2', {
              n: Math.min(2, Math.max(1, fold + 1)),
            })}
            aria-disabled={mode === 'loading'}
            aria-describedby="fold-instruction"
          />
        )}
      </div>
      <div className="fold-guide" aria-live="polite">
        <p id="fold-instruction">{status}</p>
        {!revealed && !moving && (
          <span className="tap-alternative">{t('hiddenName.tapPaper', 'or tap the paper')}</span>
        )}
        <ol className="fold-progress" aria-label={t('hiddenName.openedFolds', 'Opened folds')}>
          {[1, 2].map((n) => (
            <li
              key={n}
              className={fold >= n ? 'done' : ''}
              aria-label={t('hiddenName.fold', 'Fold {n}: {state}', {
                n,
                state:
                  fold >= n
                    ? t('hiddenName.foldOpen', 'open')
                    : t('hiddenName.foldClosed', 'closed'),
              })}
            >
              {fold >= n ? <Icon name="check" width="12" height="12" /> : n}
            </li>
          ))}
        </ol>
        {revealed && demo && (
          <button type="button" className="text-link refold" onClick={refold}>
            {t('hiddenName.foldAgain', 'Fold again')}{' '}
          </button>
        )}
      </div>
    </div>
  );
}
