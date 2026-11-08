import { useEffect, useRef } from 'react';
import { releaseCeremony, startCeremony } from '@/lib/basket-stage';

/** Names are written on slips, folded and dropped into a wicker basket before the draw is sent. */
export function DrawCeremony({ names, onDone }: { names: string[]; onDone: () => void }) {
  const done = useRef(onDone);
  const initialNames = useRef(names);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    startCeremony(initialNames.current, () => done.current());
    return releaseCeremony;
  }, []);

  // The basket itself is drawn on the page body, so it can carry on to the slips list.
  return <span className="draw-ceremony-marker" hidden />;
}
