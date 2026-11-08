# Independent participant paper creation animation

You are a Claude Opus 5.5 animation worker explicitly authorized by the user through Orca. Current shared checkout: /Users/danilo/dev/elefante-branco. Another Claude Opus 5.5 worker owns the private-ticket Three.js reveal; do NOT touch its files, library helpers or globals.css. The coordinator owns backend, selection, copy/share, fonts, notebook rings and overall design. Do not revert, commit, push or deploy.

Latest user request: "when creating a new sorteio from the names of participants, the papers should be rasgated and folded (at their own pace)." Implement this directly in the running local app, preserving existing management behavior.

## Scope

You MAY edit ONLY:
- src/components/RaffleForm.tsx: import/use a participant slip component and track which IDs were newly added, ONLY participant input/list behavior. Preserve all other current markup, especially the newly corrected front/back notebook ring layers, rules, exclusions, actions, server-action payloads and copy.
- A new src/components/ParticipantSlip.tsx and its .module.css, plus tightly scoped new creation-animation helpers if necessary.

You MUST NOT edit src/components/HiddenName.tsx, src/lib/paper-canvas.ts, globals.css, package files, backend/session/db/codes, InkFilter.tsx, ShareTickets.tsx, product/design docs or any other current changes. Three.js 0.187 is installed, but do not create one WebGL context per participant; paste supports 100 people and mobile. Prefer a lightweight CSS/material animation or a single shared renderer if genuinely necessary. Do not couple to the other worker's in-flight helper API.

## Design and behavior

- Whole app: light fibrous kraft backing, white notebook paper, blue BIC handwriting using existing --font-handwriting and --ink tokens, subtle hand-torn edges. No gray/orange backing, cards, emojis or unrelated ornament.
- On adding participants (one or bulk paste), each NEW paper strip tears free and folds vertically into quarters through two folds. Each slip has its own modest stagger and varied timing, not a synchronized row of clones. Stable variation keyed by participant ID; existing slips never reanimate on a later addition or parent re-render.
- The strip is horizontal and contains its name. As paper folds the identity can move to a stable label outside the folded slip so the organizer can still identify/remove participants. Keep accessible name and remove controls usable during/after animation. Do not hide the only accessible name.
- Preserve the names themselves, uniqueness, removal, limits, exclusions cleanup, pending/locked states and server payloads. Avoid layout jumps. Do not block creating or editing the raffle while decoration completes.
- Bound the total stagger for bulk lists. Respect prefers-reduced-motion with immediate static result. Do not use 100 independent WebGL canvases or run RAF when idle. Clean up animations/timers on removal/unmount.
- Preserve the current .people-list layout from globals.css, introducing local module classes without changing the rest of the product.
- UI copy already reviewed with Humanizer. Do not add slogans or explanatory walls of text.

Read AGENTS.md and relevant Next docs under node_modules/next/dist/docs. Local server http://localhost:3600 is already running; do not kill it. Orca browser is available; load `orca skills get orca-cli --reference references/browser.md` before using it.

## Verification and delivery

Exercise adding one name, pasted batches, a second addition (old slips stay still), removal during animation, locked/drawn state, mobile 390px and reduced motion as available. Check actual intermediate motion, not only the resting frame. Run pnpm lint and pnpm typecheck. Do not run pnpm build concurrently with the other worker; the coordinator will perform the final combined build.

This is a direct Orca launch with NO orchestration dispatch; do not call worker_done or ask. Write .impeccable/participant-animation-result.md with final status, actual model, changed files, checks/browser evidence and real limitations. The coordinator handles integration and user reply. Finish the implementation autonomously.
