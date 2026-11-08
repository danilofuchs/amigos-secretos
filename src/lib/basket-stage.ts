import type { BasketScene } from './wicker-basket-3d';

/**
 * The ceremony basket lives on its own canvas on the page body, outside React, so it survives the
 * move from the form to the slips list and keeps going there instead of starting over.
 */
type Stage = { scene: BasketScene | null; canvas: HTMLCanvasElement; unclaimed: number };
let stage: Stage | null = null;
let generation = 0;
/** How long a basket nobody picked up stays on screen before it quietly leaves. */
const UNCLAIMED_MS = 12_000;

/** Starts the basket ceremony; `onShaken` runs once the names are in and the basket is shaken. */
export function startCeremony(names: string[], onShaken: () => void) {
  dropBasket();
  const mine = ++generation;
  const canvas = document.createElement('canvas');
  canvas.className = 'draw-ceremony';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  stage = { scene: null, canvas, unclaimed: 0 };
  void (async () => {
    try {
      const family =
        getComputedStyle(document.documentElement).getPropertyValue('--font-handwriting').trim() ||
        'cursive';
      const [{ createBasketScene }] = await Promise.all([
        import('./wicker-basket-3d'),
        document.fonts.load(`500 64px ${family}`).catch(() => undefined),
      ]);
      if (mine !== generation || !stage) return;
      const box = canvas.getBoundingClientRect();
      stage.scene = createBasketScene(canvas, {
        width: box.width,
        height: box.height,
        names,
        fontFamily: family,
        onDone: onShaken,
      });
    } catch {
      if (mine === generation) {
        dropBasket();
        onShaken();
      }
    }
  })();
}

/** The ceremony's page is going away; the basket waits a while for the slips list to take it. */
export function releaseCeremony() {
  if (!stage || stage.unclaimed) return;
  stage.unclaimed = window.setTimeout(dropBasket, UNCLAIMED_MS);
}

/** Takes over the live basket, if a ceremony left one waiting. */
export function claimBasket(): BasketScene | null {
  if (!stage?.scene) return null;
  window.clearTimeout(stage.unclaimed);
  stage.unclaimed = -1;
  return stage.scene;
}

/** Lets go of a claimed basket; it leaves unless claimed again right away (a remount). */
export function letGoBasket() {
  if (!stage) return;
  window.clearTimeout(stage.unclaimed);
  stage.unclaimed = window.setTimeout(dropBasket, 300);
}

/** Fades the basket out and frees it. */
export function dropBasket() {
  const leaving = stage;
  stage = null;
  generation++;
  if (!leaving) return;
  window.clearTimeout(leaving.unclaimed);
  leaving.canvas.dataset.leaving = '';
  window.setTimeout(() => {
    leaving.scene?.dispose();
    leaving.canvas.remove();
  }, 400);
}
