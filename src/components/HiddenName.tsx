'use client';
import { useI18n } from '@/components/I18nContext';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import type { PaperStrip } from '@/lib/paper-strip-3d';
import type { NameLayout } from '@/lib/paper-texture';
import { STRIP_ASPECT, stripWidthFor } from '@/lib/paper-fold';
import { Icon } from './Icon';

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

// Chrome rejects vibrate (and logs an error) until the page has had a tap or key press.
function buzz() {
  if (typeof navigator.vibrate === 'function' && navigator.userActivation?.hasBeenActive !== false)
    navigator.vibrate(10);
}

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
    t('hiddenName.pullSidewaysOpen', 'Pull sideways to open.'),
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
      if (stage > settledRef.current) buzz();
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

  function goTo(stage: number, velocity?: number) {
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

  function startGesture(event: PointerEvent<HTMLButtonElement>) {
    const strip = stripRef.current;
    if (!strip || !event.isPrimary || event.button !== 0) return;
    const from = strip.progress;
    gesture.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      from,
      base: Math.min(1, Math.floor(from + 1e-3)),
      dragging: false,
      direction: 1,
      lastTime: event.timeStamp,
      speed: 0,
    };
  }

  function moveGesture(event: PointerEvent<HTMLButtonElement>) {
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
      claim();
      event.currentTarget.setPointerCapture(event.pointerId);
      setMoving(true);
      const natural = strip.orientation;
      const settled = g.from - g.base < 0.05;
      if (settled && Math.sign(rawDx) !== natural) strip.turn(prefersReducedMotion());
      g.direction = settled ? Math.sign(rawDx) : natural;
    }
    const quarter = strip.stripWidth / 4;
    const reach = [quarter * 1.6, quarter * 2.4] as const;
    const travel = (p: number) => Math.min(p, 1) * reach[0] + Math.max(0, p - 1) * reach[1];
    const at = (d: number) => (d <= reach[0] ? d / reach[0] : 1 + (d - reach[0]) / reach[1]);
    const next = Math.min(
      2,
      Math.max(g.base, at(Math.max(0, travel(g.from) + rawDx * g.direction))),
    );
    if (Math.floor(next) > Math.floor(strip.progress)) buzz();
    const dt = Math.max(1, event.timeStamp - g.lastTime);
    g.speed = g.speed * 0.6 + ((next - strip.progress) / dt) * 1000 * 0.4;
    g.lastTime = event.timeStamp;
    strip.setProgress(next);
  }

  function endGesture(event: PointerEvent<HTMLButtonElement>, cancelled: boolean) {
    const g = gesture.current,
      strip = stripRef.current;
    if (!g || g.pointer !== event.pointerId) return;
    gesture.current = null;
    if (!g.dragging || !strip) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    ignoreClickUntil.current = performance.now() + 350;
    const fold = Math.min(1, Math.floor(strip.progress));
    const travelled = strip.progress - fold;
    const open = !cancelled && (travelled > 0.4 || (g.speed > 2 && travelled > 0.12));
    goTo(cancelled ? g.base : open ? fold + 1 : fold, cancelled ? 0 : g.speed);
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
    width: stripWidth / 2 ** (2 - fold),
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
      : instructions[fold];

  return (
    <div className={`paper-ritual ${demo ? 'ritual-demo' : ''}`}>
      {demo && (
        <p className="demo-caption">
          {t('hiddenName.exampleSlipGoAhead', 'An example slip. Go ahead and open it.')}
        </p>
      )}
      <div className="strip-scene" data-mode={mode}>
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
            onPointerDown={startGesture}
            onPointerMove={moveGesture}
            onPointerUp={(event) => endGesture(event, false)}
            onPointerCancel={(event) => endGesture(event, true)}
            onClick={() => {
              if (performance.now() < ignoreClickUntil.current) return;
              openNext();
            }}
            aria-label={t('hiddenName.openFold2', 'Open fold {n} of 2', {
              n: Math.min(2, fold + 1),
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
