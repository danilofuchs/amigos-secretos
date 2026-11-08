import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { BasketScene } from '@/lib/wicker-basket-3d';
import { POUR_AT } from '@/lib/basket-timing';
import { claimBasket, dropBasket, letGoBasket } from '@/lib/basket-stage';

export const CEREMONY_KEY = 'draw-ceremony';
/** Marks a ceremony started on the create page, before the raffle had an id. */
export const NEW_RAFFLE = 'new';
const STEP = 0.16;
const FLIGHT = 0.95;

const subscribeNever = () => () => {};
function pendingCeremony(raffleId: string) {
  try {
    return (
      [raffleId, NEW_RAFFLE].includes(sessionStorage.getItem(CEREMONY_KEY) ?? '') &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

type Pour = { mouth: { x: number; y: number }; pourAt: number };
type Flight = { code: string; left: number; top: number; dx: number; dy: number };

/** After a draw, the basket from the ceremony empties: one closed slip lands on each person's row. */
export function TicketArrival({ raffleId }: { raffleId: string }) {
  const pending = useSyncExternalStore(
    subscribeNever,
    () => pendingCeremony(raffleId),
    () => false,
  );
  const [done, setDone] = useState(false);
  const active = pending && !done;
  const [flights, setFlights] = useState<Flight[]>([]);
  const cup = useRef<HTMLDivElement>(null);
  const landed = useRef(0);

  useEffect(() => {
    const panel = cup.current?.closest<HTMLElement>('.share-panel');
    if (!active || !panel) return;
    panel.dataset.arriving = '';
    panel.scrollIntoView({ block: 'start', behavior: 'instant' });
    return () => {
      delete panel.dataset.arriving;
    };
  }, [active]);

  const [pourAt, setPourAt] = useState(POUR_AT);
  const launch = useCallback((ready: Pour | null) => {
    const panel = cup.current?.closest<HTMLElement>('.share-panel');
    if (!panel) return;
    const targets = [...panel.querySelectorAll<HTMLElement>('[data-ticket]')];
    if (!ready) {
      for (const target of targets) target.dataset.landed = '';
      setDone(true);
      return;
    }
    const { mouth } = ready;
    setPourAt(ready.pourAt);
    setFlights(
      targets.map((target) => {
        const rect = target.getBoundingClientRect();
        return {
          code: target.dataset.ticket ?? '',
          left: mouth.x - 15,
          top: mouth.y - 10,
          dx: rect.left + rect.width / 2 - mouth.x,
          dy: rect.top + rect.height / 2 - mouth.y,
        };
      }),
    );
  }, []);

  function land(code: string) {
    const target = cup.current
      ?.closest('.share-panel')
      ?.querySelector<HTMLElement>(`[data-ticket="${code}"]`);
    if (target) target.dataset.landed = '';
    landed.current++;
    if (landed.current < flights.length) return;
    try {
      sessionStorage.removeItem(CEREMONY_KEY);
    } catch {
      /* nothing to clear */
    }
    setTimeout(() => setDone(true), 450);
  }

  // The basket floats over the page instead of taking room, so the rows never move when it leaves.
  return (
    <div className="arrival-anchor">
      <AnimatePresence>
        {active && (
          <motion.div
            key="cup"
            ref={cup}
            className="arrival-cup"
            aria-hidden="true"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ duration: 0.35 }}
          >
            <ArrivalBasket onReady={launch} />
          </motion.div>
        )}
        {active && flights.length > 0 && (
          <div key="flights" className="arrival-flights" aria-hidden="true">
            {flights.map((flight, i) => (
              <motion.span
                key={flight.code}
                className="folded-ticket flying"
                style={{ left: flight.left, top: flight.top }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
                animate={{
                  opacity: [0, 1, 1, 1],
                  x: [0, ((i % 3) - 1) * 14, flight.dx * 0.55, flight.dx],
                  y: [0, 46, flight.dy * 0.6 + 20, flight.dy],
                  scale: [0.6, 0.95, 1.1, 1],
                  rotate: [0, 70 * ((i % 2) * 2 - 1), 200, 354],
                }}
                transition={{
                  duration: FLIGHT,
                  delay: pourAt + i * STEP,
                  times: [0, 0.22, 0.6, 1],
                  ease: ['easeIn', 'easeInOut', 'easeOut'],
                }}
                onAnimationComplete={() => land(flight.code)}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Pours the slips out: the ceremony's own basket when it is still on screen, carried here, or else
 * a fresh one that shakes and tips on its own. Owning it here keeps it alive through the exit.
 */
function ArrivalBasket({ onReady }: { onReady: (pour: Pour | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const carried = claimBasket();
    if (carried) {
      // After the list has scrolled into place, which the parent does in its own effect.
      const frame = requestAnimationFrame(() => {
        const box = canvas.getBoundingClientRect();
        onReady(
          carried.pourInto({
            x: box.left + box.width / 2,
            y: box.top + box.height / 2 + box.height * 0.08,
            radius: Math.min(62, box.width * 0.3),
          }),
        );
      });
      return () => {
        cancelAnimationFrame(frame);
        letGoBasket();
      };
    }
    dropBasket();
    let scene: BasketScene | null = null;
    let cancelled = false;
    void import('@/lib/wicker-basket-3d')
      .then(({ createBasketScene }) => {
        if (cancelled) return;
        const box = canvas.getBoundingClientRect();
        scene = createBasketScene(canvas, {
          width: box.width,
          height: box.height,
          names: [],
          pour: true,
          fontFamily: 'cursive',
          onDone: () => {},
        });
        const opening = scene.pouredMouth();
        onReady({ mouth: { x: box.left + opening.x, y: box.top + opening.y }, pourAt: POUR_AT });
      })
      .catch(() => {
        if (!cancelled) onReady(null);
      });
    return () => {
      cancelled = true;
      scene?.dispose();
    };
  }, [onReady]);
  return <canvas ref={canvasRef} />;
}
