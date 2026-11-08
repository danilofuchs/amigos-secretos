# Participant slip creation animation: result

Status: done. Not committed, not built (coordinator does the combined build).
Model: Claude Opus 5.5 (`claude-opus-5-5`).

## Changed files

- `src/components/ParticipantSlip.tsx` (new)
- `src/components/ParticipantSlip.module.css` (new)
- `src/components/RaffleForm.tsx`: only participant list and `addNames` changes:
  - imported `ParticipantSlip`, plus `useCallback`
  - `freshStagger` state (`Map<id, staggerMs>`), replaced on every add, empty under reduced motion
  - `removeParticipant` is the same logic as the old inline handler (removes the participant, cleans up exclusions, resets the from/to selects), now behind a stable `useCallback`
  - `<li>` now renders `<ParticipantSlip>`. The old `slip-shadow` and `.name-slip.torn-paper` markup on the li was replaced, because a filter or clip-path in that position would flatten the 3D fold.
  - Untouched: notebook rings and layers, rules, exclusions, actions, the hidden `input` payload, copy, limits and uniqueness.

Untouched as required: globals.css, HiddenName, paper-canvas/paper-* libs, InkFilter, ShareTickets, backend, packages, docs. The `.people-list` grid, the per-li rotation and the 2-column mobile layout from globals.css still apply.

## How it works

- CSS-only 3D: no WebGL, no RAF, no JS timers. Each new slip mounts a strip of 4 panels with front and back faces. Hinges:
  - P1 is static.
  - `hingeHalf` at 50% holds P3 and P4, and does fold 1 (P4 lands on P1, P3 on P2).
  - `hingeQuarter` holds P2, and `hingeInner` holds P3 with its axis at P3's right edge. Both rotate together for fold 2, so the doubled 25–50% part closes over P1.
  - Small `translateZ` offsets keep the stack free of z-fighting.
- Sequence: tear (a ragged stub along the top edge stays and drifts away while the strip jerks free), fold 1, fold 2, then a settle that tilts the packet and scales it to 0.8.
- Final state is the base CSS. Keyframes define only `from`, with `animation-fill-mode: backwards`, so the strip sits flat during its delay.
- When the last animation (`settle` on `.paper`) ends, the slip switches to a 2-div static packet with a drop-shadow. At rest, 100 slips don't keep ~800 preserve-3d layers alive. Slips loaded from an existing raffle, and locked or drawn slips, render static from the start.
- Variation is seeded from the participant ID (FNV + mulberry32): start jitter 0–170ms, tear 300–430ms, fold 1 420–600ms, fold 2 380–540ms, the gaps between phases, tear drift and turn, rest tilt ±4.5°, and torn-edge polygons.
- Batch stagger is `min(85ms, 1100ms / count)`, so the whole batch is bounded at about 1.1s plus per-slip jitter. Worst-case total is about 3.5s.
- Each slip freezes its stagger in `useState` on mount. Later additions or parent re-renders never restart or retime a running slip, and old slips never reanimate.
- Accessibility:
  - The visible label (`.handwritten`, so it gets the ink filter) is the only accessible name, present from the first frame. It fades in as the paper folds.
  - All painted strip copies are `aria-hidden`, and `.paper` has `pointer-events: none`.
  - The remove button sits outside the 3D tree with z-index above the paper, so it is usable throughout and keeps the same `aria-label`.
- Layout: the li height comes from the label row from the first frame. Paper is a fixed 58px band, centered vertically, so long names wrap without the packet stretching and nothing jumps.
- Reduced motion: `addNames` checks `matchMedia` and marks nothing fresh. The global 1ms rule also covers a mid-animation change of the media setting.

## Verification (Orca browser, localhost:3600)

Intermediate frames were captured by pausing `document.getAnimations()` and scrubbing `currentTime`.
- One name at desktop, t=150…1450ms: flat strip with stub, tear offset, half-fold mid-rotation, half-folded, quarter fold mid-rotation, settled packet with label.
- Seams between panels: fixed with a 0.5px face overlap.
- Ghost label over the flat strip (the ink filter created a stacking context): fixed with `.paper` z-index 1 and the label `position: relative`.
- Paste of 12: scrubbed at 700, 1100 and 1500ms, slips were at clearly different phases (some flat, some half-folded, some quartered).
- Second addition after a batch settled: only the 2 new slips had the `animating` class (14 animations = 7 × 2). The other 12 stayed static.
- Removal mid-animation ("Paula" at 500ms): removed cleanly, the others continued and settled, no errors.
- Locked/drawn: created local test raffle `8YjEE45rMBRR` ("Teste animação papeizinhos"; delete it if you don't want it), saved, then drew. Edit page: 4 static packets with labels, 0 animating, 0 remove buttons, locked hint shown.
- Mobile 390px (`viewport --mobile`): 2 columns kept. An 80-character name wraps in the label while the packet stays 58px. The strip text clips at the strip edge during the flat phase, but the label carries the full name.
- Reduced motion (`set media reduced-motion`, native `matches: true`): added slips rendered static immediately, 0 animations.
- 100-name paste at 390px: peak 701 CSS animations, all 100 settled to static (0 animations, 0 `animating` afterward).
- Hydration: loaded server-rendered `/sorteios/8YjEE45rMBRR` fresh; the console showed no hydration or mismatch warnings (seeded clip-path strings match between server and client).
- `pnpm lint`: clean. `pnpm typecheck`: clean.
- Console: only the existing Next warning about `scroll-behavior: smooth` on `<html>`, which comes from globals/layout and is not part of this work.

## Limitations

- Not checked in Safari/WebKit. The Orca browser is Chromium. WebKit has historically rendered `clip-path` together with `backface-visibility` under `preserve-3d` differently, so check on an iPhone. If something breaks there, the fallback is to drop the face clip-paths during motion.

- Frame timing for the 100-name burst could not be measured. rAF in the Orca page ran at about 1Hz (throttled view), so p95 numbers are meaningless. Every animated property is a compositor transform or opacity, clip-paths sit on leaf faces, and there are no filters during motion. Still, a real mid-range phone should be checked with 100 names.
- The strip faces use the handwriting font without the SVG ink filter, to keep 400 animating faces cheap. The label, which carries the filter, fades in as the paper folds, so the pen texture differs slightly during the ~1.5s fold.
- The 4 painted copies of the name exist in the DOM only during the animation. They are `aria-hidden`, but in-page find (Ctrl+F) can match them briefly.
- Labels are narrower than the old full-width slips, because the folded packet takes about 20% of the cell. Long names wrap more, mid-word because of `overflow-wrap: anywhere`.

## RaffleForm.tsx diff (file is untracked, so `git diff` cannot show it)

```diff
--- a/src/components/RaffleForm.tsx	2026-11-08 13:29:30
+++ b/src/components/RaffleForm.tsx	2026-11-08 13:20:00
@@ -1,8 +1,12 @@
 'use client';
-import { useActionState, useState } from 'react';
+import { useActionState, useCallback, useState } from 'react';
 import { saveRaffle } from '@/app/create/actions';
 import type { Exclusion, Participant, Raffle } from '@/lib/raffle';
 import { Icon } from './Icon';
+import { ParticipantSlip } from './ParticipantSlip';
+
+const BATCH_STAGGER_MS = 1100;
+const MAX_STEP_MS = 85;
 export function RaffleForm({ raffle }: { raffle?: Raffle }) {
   const [participants, setParticipants] = useState<Participant[]>(raffle?.participants ?? []);
   const [exclusions, setExclusions] = useState<Exclusion[]>(raffle?.exclusions ?? []);
@@ -13,6 +17,7 @@
   const [to, setTo] = useState('');
   const [both, setBoth] = useState(true);
   const [localError, setLocalError] = useState('');
+  const [freshStagger, setFreshStagger] = useState<ReadonlyMap<string, number>>(new Map());
   const [state, action, pending] = useActionState(saveRaffle, {});
   const locked = !!raffle && raffle.status !== 'draft';
   const archived = raffle?.status === 'archived';
@@ -27,9 +32,18 @@
     });
     if (unique.some(name => name.length > 80)) { setLocalError('Use nomes com até 80 caracteres.'); return; }
     if (participants.length + unique.length > 100) { setLocalError('O limite é de 100 participantes.'); return; }
-    setParticipants(p => [...p, ...unique.map(name => ({ id: crypto.randomUUID(), name }))]);
+    const added = unique.map(name => ({ id: crypto.randomUUID(), name }));
+    const step = Math.min(MAX_STEP_MS, BATCH_STAGGER_MS / added.length);
+    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
+    setFreshStagger(new Map(animate ? added.map((p, i) => [p.id, Math.round(i * step)]) : []));
+    setParticipants(p => [...p, ...added]);
     setNames(''); setLocalError(unique.length !== additions.length ? 'Os nomes repetidos não foram adicionados.' : '');
   }
+  const removeParticipant = useCallback((id: string) => {
+    setParticipants(ps => ps.filter(q => q.id !== id));
+    setExclusions(es => es.filter(e => e.from !== id && e.to !== id));
+    setFrom(''); setTo('');
+  }, []);
   const personName = (id: string) => participants.find(p => p.id === id)?.name;
   return <form action={action} className="raffle-form">
     <input type="hidden" name="input" value={JSON.stringify({ title, rules, participants, exclusions })}/>
@@ -51,7 +65,7 @@
           <legend className="sr-only">Participantes</legend>
           <div className="section-heading"><h2>Os papeizinhos</h2><span className="count" aria-live="polite">{participants.length} {participants.length === 1 ? 'nome' : 'nomes'}<span> / 100</span></span></div>
           {!locked && <><label htmlFor="names">Quem vai participar?</label><div className="name-entry paper-shadow"><textarea id="names" value={names} onChange={e => setNames(e.target.value)} rows={3} placeholder={'Ana\nBruno\nCarla'} maxLength={10000} aria-describedby="names-help"/></div><div className="name-entry-actions"><p className="hint" id="names-help">Um por linha ou separados por vírgula.</p><button type="button" className="button secondary small" onClick={addNames} disabled={!names.trim()}><Icon name="plus"/> Adicionar</button></div></>}
-          {participants.length ? <ul className="people-list">{participants.map(p => <li key={p.id} className="slip-shadow"><div className="name-slip torn-paper"><span>{p.name}</span>{!locked && <button type="button" className="icon-button remove" aria-label={`Remover ${p.name}`} onClick={() => { setParticipants(ps => ps.filter(q => q.id !== p.id)); setExclusions(es => es.filter(e => e.from !== p.id && e.to !== p.id)); setFrom(''); setTo(''); }}><Icon name="close"/></button>}</div></li>)}</ul> : <div className="empty-slips"><span className="empty-slip-back" aria-hidden="true"/><div className="empty-slip-front torn-paper"><p>Os nomes vão<br/>aparecendo aqui.</p></div></div>}
+          {participants.length ? <ul className="people-list">{participants.map(p => <li key={p.id}><ParticipantSlip id={p.id} name={p.name} staggerMs={freshStagger.get(p.id)} onRemove={locked ? undefined : removeParticipant}/></li>)}</ul> : <div className="empty-slips"><span className="empty-slip-back" aria-hidden="true"/><div className="empty-slip-front torn-paper"><p>Os nomes vão<br/>aparecendo aqui.</p></div></div>}
           {locked && <p className="hint locked-hint"><Icon name="lock"/> Depois de sortear, os nomes e as restrições ficam fixos.</p>}
         </fieldset>
         <details className="exclusion-details" open={exclusions.length > 0 || undefined}>
```
