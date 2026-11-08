# 3D paper reveal: completion report

**Status: DONE.** Lint, typecheck, unit tests and production build all exit 0. Real-browser verification passed at 1280px desktop and at a 390px touch phone viewport.
**Model:** Claude Opus 5.5 (`claude-opus-5-5`), running in Claude Code.

## What changed

| File | Change |
|---|---|
| `src/components/HiddenName.tsx` | Rewritten. Props are unchanged (`{ name: string; demo?: boolean }`). Three.js loads through a dynamic `import()`. The component handles gestures, tap, keyboard, haptics, reduced motion, focus, refold, the no-WebGL fallback and the final selectable `<h2>`. |
| `src/lib/paper-fold.ts` | **New.** Pure fold kinematics: four quarters, creases at s = 1, 2, 3, and one progress scalar `p ∈ [0,2]` (0 = folded, 1 = quarter fold open, 2 = whole strip). It also holds the strip aspect and width helpers. |
| `src/lib/paper-fold.test.ts` | **New.** Node tests for layer order, packet separation through the whole swing, creases staying joined, flaps rising toward the viewer, and the flat open state. They run under the existing `pnpm test`. |
| `src/lib/paper-texture.ts` | **New.** Front and back `<canvas>` faces sharing one UV layout: a seeded torn outline, paper grain and fibres, rules on both sides, faint crease lines, the handwritten name with subtle ballpoint irregularity, and a mirrored bleed-through on the back. |
| `src/lib/paper-strip-3d.ts` | **New.** The Three.js controller: renderer, camera, lights, shadow floor, the 4 quarter meshes, an on-demand render loop, a critically damped spring and full disposal. |
| `src/lib/paper-canvas.ts` | **Removed.** This was the interim 2D renderer, now replaced. Nothing else imported it. |
| `src/app/globals.css` | Only the `.strip-*` rules (scene, canvas, hit area, name overlay, flat fallback) and the `≤650px` `.strip-*` rule were changed. The `.strip-name h2` medium/long size classes were dropped because size now comes from the texture layout. `.paper-ritual`, `.fold-guide`, `.fold-progress`, `.demo-caption` and `.refold` are untouched. |

Not touched: package manifests and lockfile, backend, routes, `InkFilter.tsx`, the global `::selection` rule, copy, fonts and docs.

## How it works

- **Geometry and hinges.** Quarter 1 is fixed. Q0 hinges at s=1, and Q2 hinges at s=2. Q3 hinges at s=3 inside Q2's frame, so creases stay joined by construction.
- **Layer stacking.** Each hinge axis is lifted off the paper (by 1.5, 0.5 and −0.5 of a 0.7px layer gap), so a 180° turn lands one gap above the layer below. Folded, the stack is Q1 < Q2 < Q3 < Q0. Opening goes quarter → half → whole.
- **No duplicate planes or z-fighting.** Each quarter has one geometry, rendered as a `FrontSide` mesh with the front texture and a `BackSide` mesh with the back texture. Culling means the two never draw the same pixel. The camera's near and far planes are tight.
- **Paper motion.** Moving flaps bow slightly in mid-swing. The bend is zero at rest and fades out near the table. The outermost fold rests sprung open by a few degrees, and the open strip keeps a gentle valley/valley/mountain crease relief.
- **Name revealed by the paper itself.** The name lives in the shared front texture, so it is revealed by the unfolding paper. During the half fold, "Ma" shows on the fixed half first, then "rina" rotates into view on the moving flap.
- **Bleed-through.** The back face carries the ink layer at about 6% total alpha with a slight blur. It is drawn unmirrored; looking at a back face mirrors it physically. You can faintly read a mirrored "ani…" on the back after the first fold.
- **Lighting.** Lambert lighting is calibrated so flat paper renders at exactly the `--paper` white. Tilted panels shade naturally. A `ShadowMaterial` floor on a transparent canvas casts soft PCF shadows onto the kraft page background. The paper does not receive shadows, which avoids acne between layers 0.7px apart.
- **Scale and framing.** One world unit equals one CSS pixel on the table. The canvas extends 40px above and below the scene so lifted flaps and shadows aren't clipped. The −1.43° tilt is kept.
- **Name texture and long names.** The texture is drawn only after `document.fonts.load()` resolves the hashed `--font-handwriting` family, with a 2.5s timeout. Long names wrap to two handwritten lines, sitting on the two rules.

**Input:**
- Drag scrubs the current fold, and you can drag in either horizontal direction. Release continues from the current angle via a spring that carries the release velocity. Past 40% of the fold, or on a quick flick, it opens; otherwise it returns to the start of that fold.
- After 10px of mostly vertical movement the gesture is abandoned, and `touch-action: pan-y` keeps native page scroll.
- `pointercancel` returns to the fold's start.
- Tap, Enter and Space use the same spring and retarget mid-motion, so rapid taps go smoothly to fully open.
- `navigator.vibrate(10)` fires only when it exists and a fold settles open.
- With `prefers-reduced-motion`, taps and releases jump instantly to the end state.
- Refold (demo only) plays the motion in reverse and returns focus to the paper button.

**Performance and cleanup:**
- Three.js lives in its own dynamic chunk (`.next/static/chunks/3baoz53792ri4.js`, about 545 KB minified). The home page's initial client manifest doesn't reference it.
- Pixel ratio is capped at 2.
- Rendering happens only when a frame is requested: during the spring, a drag, a resize or texture readiness. Nothing runs at rest.
- Dispose releases the RAF, ResizeObserver, context-loss listener, geometries, materials, textures, the shadow map and the renderer. GL state is reset first, so a remount on the same canvas is clean.

**Fallback.** If WebGL is unavailable or the context is lost, the component shows a CSS torn-paper strip. It steps a quarter → half → whole in width, and at the end shows the real `<h2>` in ink. The same strip appears during the short Three.js load, so the layout doesn't jump.

**Accessibility:**
- The name is not in the DOM until revealed.
- Once revealed, a focused `<h2>` with the real name is overlaid on the drawn name. It uses the same font size and baseline, with transparent glyphs.
- Native selection and copy work, using the normal global `::selection` colours. The highlighted DOM text lines up with the drawn name (`desk-4-selected.png`).
- Instructions remain Portuguese and outside the paper. Copy is unchanged; the status line is empty while refolding instead of saying "Abrindo…".

## Checks

- `pnpm lint`: exit 0. The baseline was also 0 before any edits.
- `pnpm typecheck`: exit 0.
- `pnpm test`: 10/10 pass, including 4 new fold-kinematics tests.
- `pnpm build`: exit 0.
- All four checks were rerun after the final edits, and all exited 0.
- `curl localhost:3600` returned 200 after the build. The user's dev server was not stopped.

## Browser evidence

The Orca embedded browser rendered the reveal correctly, and mid-drag captures were taken there. Its tab throttled `requestAnimationFrame` to about 1 fps (measured: 30 frames in 30s), so motion timing there is not representative.

Full verification therefore used **headless Chrome over CDP** against the live dev server at `http://localhost:3600/`, the home demo. It used real `Input.dispatchMouseEvent`, `dispatchTouchEvent` and `dispatchKeyEvent` input and real touch emulation. The harness is saved as `.impeccable/review/animation/cdp-harness.mjs.txt`; the `.txt` suffix keeps it out of `eslint .`. To run it, copy it to a `.mjs` file outside the repo and run `node cdp-harness.mjs <outDir> <scenario…>`. Scenarios: desktop, keyboard, mobile, cancel, rapid, resize, reduced, longname, nondemo, flat (flat needs `FLAGS="--disable-webgl --disable-3d-apis"`). All captures are in `.impeccable/review/animation/`.

| Scenario | Result |
|---|---|
| Desktop tap → filmstrip at 80/180/300/450ms | The quarter flap swings over with its back visible, then lands. Settled about 560ms after the tap. (`desk-1-tap-*`) |
| Desktop mouse drag on the half fold, held mid-drag at 40% and 75% | The flap stands up showing the mirrored ghost, and the name appears progressively. On release it continues from that angle to open. The `h2` gets focus. (`desk-2-drag-*`, `desk-3-open`) |
| Selection of the final name | Selection returns "Marina" and looks normal. (`desk-4-selected`) |
| Refold | Plays in reverse back to folded, and focus returns to the paper button. (`desk-5-refold-*`, `desk-6-refolded`) |
| Keyboard: focus the button, Enter ×2 | Opens fold 1, then fold 2. Focus ends on `H2: Marina`. |
| 390px touch: vertical swipe over the paper | The page scrolled (scrollY 444 → 558) and no fold opened. |
| 390px touch: slow 35px drag, then release | Returned to folded. (`phone-1-*`) |
| 390px touch: leftward drag | Opens the quarter fold, and either direction works. (`phone-2-drag-mid`, `phone-3-half`) |
| 390px touch: half-fold drag held at 35% and 70% | Name partially revealed, flap shadow on the kraft. Opens on release. (`phone-4-*`, `phone-5-open`) |
| Touch cancel mid-drag | Status shows "Abrindo…" during the drag; after `touchcancel` the strip returns to folded with the instruction restored. |
| 4 rapid taps | Ended fully open, with no stuck or jumping state. (`rapid-*`) |
| Resize from 1280 to 390 mid-tween | Settled correctly and re-framed at phone size. (`resize-*`) |
| Reduced motion | The state is final within 50ms of each tap. (`reduced-*`) |
| Long name "Maria Eduarda Albuquerque de Souza", props swapped via a React DevTools hook | Two-line handwriting, folds correctly, and the `h2` text is the full single string. (`long-*`) |
| Non-demo props (`demo=false`, swapped via the same hook) | Opened twice. Status reads "Não conta pra ninguém, hein.", with no demo caption and no refold link. (`nondemo-open`) |
| `--disable-webgl --disable-3d-apis` | `data-mode=flat`; the CSS fallback steps through and reveals a focused `h2`. (`flat-*`) |

Browser consoles were clean in every scenario apart from React DevTools/HMR info, checked by grepping the saved `report-*.txt`. The one exception is the forced no-WebGL run, where Three.js logs the expected "A WebGL context could not be created" error before the fallback takes over. On WebGL context loss the strip is disposed and the component switches to the CSS fallback.

## Limitations and notes for the coordinator

- **Not run on real devices.** Haptics and real devices (iOS Safari, Android) were not exercised. Phone behaviour was tested with Chrome touch emulation, and `navigator.vibrate` only runs when it exists. iOS Safari has no vibrate support, so it degrades silently.
- **Drag direction.** Drag accepts either horizontal direction for both folds, rather than following each flap's physical direction. This was a deliberate choice for discoverability on small screens.
- **Name alignment.** The name overlay is a close match to the texture, not pixel-exact. You only notice this while text is selected.
- **Bundle size.** Three.js is imported as named imports from `three`, which tree-shakes poorly, so the dynamic chunk is about 545 KB minified. It loads after first paint and never blocks the page.
- **Ticket route.** The private ticket route wasn't exercised with a real ticket, as instructed (stale codes). It renders the same component with the assigned name.
- **New status text.** Only one string changed: the status line stays empty while refolding.
- **Docs to sync.** `DESIGN.md` and `PRODUCT.md` were not edited. They should describe two vertical folds, a horizontal torn strip, a 3D WebGL reveal and the CSS fallback.

## Follow-up: pencil drafts and "tirando a limpo"

This was requested by the user directly, in a later turn.

- **Files.** New `src/components/CleanCopyField.tsx` and `CleanCopyField.module.css`. `RaffleForm.tsx` now uses them for the title, rules and names fields, via the new `onValue` prop. No global CSS was changed.
- **Pencil.** Placeholders are faint graphite (`#9d9c96`, weight 400). Typed text stays pencil (`#5c5f66`) until the field is committed.
- **Pen trace.** On blur, an ink copy of the text is traced over the pencil line by line, left to right, at about 1100 px/s, capped at 1.5s total. Line boxes come from `Range.getClientRects()` on an exact style copy, so wrapped textarea lines trace in order. After that the field is ink and stays ink while edited, unless it's emptied back to pencil. Values loaded from an existing raffle start in ink.
- **Interruptions and reduced motion.** Focusing or typing during the trace finishes it immediately. With reduced motion, the field switches to ink instantly.
- **Names box.** It stays pencil, because "Adicionar" already turns names into inked slips.
- **Verified** in headless Chrome at 1280 and 390, with mid-trace frames and reduced motion, in `.impeccable/review/clean-copy/`. Lint, typecheck, tests and build all exit 0.

## Follow-up: user-requested changes in the same session

- **Folds open the same way.** Both folds now open toward the right (new kinematics: Q0 is fixed; the packet's right quarter folds over its left). One continuous drag carries through both folds. Dragging the other way turns the strip 180° on the table, and once fully open it lifts and turns itself upright before settling. Haptics only fire after the page has had a user activation.
- **Phones on the LAN.** `next.config.js` gained `allowedDevOrigins: ['192.168.*.*']`. Without it, the dev server blocked HMR, so the page never hydrated when opened by its LAN address.
- **Lines and labels.** Notebook field baselines now sit 2px above a rule at 1280, 1000, 760 and 390px, using relative offsets in `globals.css`.
- **Rules field.** It grows one 32px line at a time with no resize handle (`growByLine` on `CleanCopyField`). The new `NotebookRings` component keeps a fixed 55px ring pitch and adds rings as the page grows.
- **Participant slips.** The label beside the folded slip is a typed UI caption instead of a second handwritten copy. The ✕ is hidden until hover or focus on hover-capable devices.
- **Accordion.** "Quem não pode tirar quem?" now uses a `Disclosure` button with a `motion` height/opacity animation, and respects reduced motion. `motion` 14.10.1 was added as a dependency at the user's request.

## Follow-up: two-page notebook, ripped out at the draw

- **Two pages.** `RaffleForm` is now a two-page notebook with index tabs ("Nomes", "Combinados") and page-turn links.
  - Page 1 holds the names, written in pencil on the ruled page, plus the optional "Quem não pode tirar quem?" fold-out.
  - Page 2 holds the combinados.
  - Slips stay on the desk beside the notebook on desktop, and below it on phone.
- **Page turn.** The names page swings around the spiral to −92° using `motion`, then hides. The hidden page is `inert`, and focus moves to the new page's heading. Tabs support the arrow keys.
- **Optional title.** An empty title becomes "Amigo secreto" in `validateInput`, with a new test case.
- **Rip.** "Sortear os nomes" asks for confirmation, plays the rip, then submits through `requestSubmit` with the draw button as submitter. If the action returns an error, the pages come back. A drawn or archived raffle shows loose torn sheets with no rings and opens on the "Combinados" page.
- **Verified** with an end-to-end CDP run at 1280px and 390px: create → turn pages → create → draw → share. Focus moved correctly, and there was no horizontal overflow at any point. Lint, typecheck, tests and build all exit 0.
- **Copy not updated.** The `/create` intro still reads "Escreva os combinados e adicione quem vai participar." Coordinator: consider putting names first.
- **Later tweaks.**
  - Page tabs are now faded-neon sticky index flags with pen-written labels. The current page's flag lies over the paper; the other tucks behind, showing only its top.
  - The "Adicionar" button and the "um por linha" hint are gone. The names text is the participant list: a line commits on Enter, paste, line deletion or blur. Removing a slip erases that name from the text.
  - The ring clipping is fixed: the desk clip was replaced with `body { overflow-x: clip }`, and the rip now falls downward.
  - Verified end to end at 390px, plus a names-behaviour run. All checks exit 0.

## Follow-up: three pages, baseline grid, flags, focus box (later in the session)

- **Three pages.** The notebook is now Nomes → Exceções → Combinados, using the generic `Sheet` component in `RaffleForm.tsx`. Exceções is written on the page as "[alguém ▾] não tira [alguém ▾]", with "e vice-versa" and "Anotar". `Disclosure.tsx` was removed.
- **Baseline grid.** Notebook pages use a 32px grid (`--line`). Every block is a multiple of 32px and the ruling starts at the page top. A constant nudge per element puts baselines 2px above the rules at 1280, 760 and 390px, all measured.
- **Flags.** Flag labels sit higher. The three flags are pink, green and yellow.
- **Focus box.** Written fields show a hand-drawn coral highlighter box on focus, revealed with a wipe.
- **Slip pile removed.** The pile was removed from the editing desk at the user's request, ahead of a planned finalize ceremony (slips folded into a cup, then distributed anonymously to the share list). `ParticipantSlip.tsx` is now unused but kept for that ceremony.
- **Pending user asks, not started:** viewed tracking for ticket links (needs a DB column), 3D rings, and the cup ceremony.
- **Tab in notebook textareas** (`tabToNextLine` on `CleanCopyField`, used by Nomes and Combinados). Lines behave like stacked inputs: Tab on a written line moves to the next line with the cursor at its end, and only adds a new line after the last one. Tab on an empty line leaves the field. Shift+Tab and modified Tab behave normally. Verified with real key events.
- **Focus highlighter** is drawn at the field's pixel size: a ResizeObserver supplies the size, corners stay fixed and the wobble is seeded once per focus. It tracks fields that grow line by line, and those fields keep one spare empty line. Colors rotate per focus. Default focus rings on links and icon buttons are rounded.

## Follow-up: "opened" tracking and "Voltar a editar" (done; typecheck now affected by an external change)

- **Schema.** `schema.sql` has a new `ticket_opens(code, opened_at)` table, created by the existing `CREATE TABLE IF NOT EXISTS` startup, so no migration is needed.
- **Store.**
  - `markTicketOpened(code)` only inserts for tickets of drawn raffles, and only the first open counts.
  - `getTicketOpens(id, owner)` returns the opens for one raffle.
  - `updateRaffle(..., 'reopen')` runs one batch: an UPDATE guarded by `NOT EXISTS` opened tickets that sets the raffle back to draft and bumps the version, then deletes that raffle's tickets.
- **Actions.** `src/app/create/actions.ts` accepts `intent=reopen`. The new `src/app/[code]/actions.ts` exports `markOpened`, which the ticket page passes to `HiddenName` as `openAction`; it fires once when the paper is fully unfolded.
- **UI.**
  - ShareTickets rows show "abriu dd/mm às hh:mm" (America/Sao_Paulo) or "ainda não abriu".
  - A drawn raffle shows "Voltar a editar" while nothing is opened, and a lock note after that.
- **Verified end to end in headless Chrome.**
  - Draw: all rows say "ainda não abriu".
  - A preview-style GET of a ticket link does not count as opened.
  - Reopen: badge goes back to "Preparando" and names are kept; the old link returns "Não encontramos este bilhete".
  - Redraw issues new codes.
  - Unfolding one ticket shows "abriu 08/11 às 14:56" on that row only, and the reopen button becomes the lock note.
- **Known gap.** The success notice after reopening isn't visible, because the form remounts on the version bump.
- **Typecheck status.** It was green until the coordinator enabled `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and related flags in `tsconfig.json` mid-session. Typecheck now reports 45 errors across `HiddenName`, `CleanCopyField`, `paper-texture`, `paper-fold.test`, `ShareTickets`, `store`, `raffle`, `raffle.test` and `ParticipantSlip`. Several of these files were being reformatted concurrently, so I paused rather than edit the same files in parallel. The fixes are mechanical: guard `entry`/index access, and avoid passing `undefined` to optional props.
- **Next, on the user's request:** the cup ceremony.

## Follow-up: ceremony, autosave, one-press draw (latest)

- **Wicker basket ceremony.** `src/lib/wicker-basket-3d.ts` is a lazy-loaded Three.js scene: a procedural woven basket with a rope rim, plus name slips that fold in 3D through the `paper-fold` kinematics, tumble along a Bézier arc and drop behind the walls, followed by a damped shake.
  - `DrawCeremony` shows it full-viewport before the draw is submitted.
  - `TicketArrival` shows a small basket on the share list and flies one closed ticket to each row. It is linked across the reload by a `sessionStorage` flag: the raffle id, or `new` from the create page.
  - `Cup.tsx` was removed.
- **Rip.** It now has inertia: a tug, a snap, then a glide that decelerates sideways while it falls, with a 3D turn.
- **One press.**
  - The create page has only "Sortear os nomes". The server creates and draws in one action (`intent=draw` with no id).
  - The browser `confirm()` is gone, because a raffle stays editable through "Voltar a editar" until a ticket is opened.
  - The Combinados page has its own "Sortear os nomes" call to action.
- **Autosave on the raffle page.** It debounces 800ms and calls the server action directly, so fields are never disabled. `save` returns the new version, and the form is keyed by id and status instead of version, so typing keeps focus. "Tudo salvo" / "Salvando…" replaces the "Salvar alterações" button.
- **Header and footer.** The mobile header is one 60px row ("Meus sorteios" plus "+ Criar"). The phone footer is just the button and one hint.
- **Other changes.**
  - The landing-page demo name is random per load, via `useDemoName` and `useSyncExternalStore`.
  - The project has a `.claude/settings.json` PostToolUse hook that runs `oxfmt` on files after Write/Edit.
- **Verified in headless Chrome** at 1280 and 390: create, one press, rip, basket, share list arrival (6/6 landed); autosave keeps focus and survives a reload; random demo name. Lint, typecheck, tests and build all exit 0.

### Follow-up: basket exit and stronger shake
- The share-page basket now lives in its own `ArrivalBasket` component, so the 3D scene keeps rendering until the exit animation removes it. The exit animates height and margins to 0, so the list slides up instead of jumping.
- The shake is longer (1.8s) and stronger: it builds up and then settles down, and adds a tilt plus a vertical bounce, measured from the basket's resting position. The ticket flights wait for the new shake length.

### Follow-up: pour, inline redraw, send list, loose sheets, paper picker
- **Pour.** On the share page, the basket shakes, tips over its rim and stays upside down; the slips fall from its opening. `mouth()` refreshes the camera and basket matrices before projecting; it used to run before the first render and returned positions far outside the canvas. Timing lives in `src/lib/basket-timing.ts`, so the share page doesn't load Three.js eagerly.
- **Redraw that keeps links.**
  - `updateRaffle(..., 'redraw')` → `publishDraw`. Each ticket keeps its code by `participantId`, falling back to the name for older tickets. A new random `drawId` guards the ticket delete and insert in one batch, which only applies while nobody has opened a ticket.
  - `markTicketOpened(code, drawId)` records an open only for the draw the page was loaded with. `HiddenName` claims the ticket on the first opening gesture and reloads if the draw changed.
  - `reopen` is gone.
- **Inline editing.**
  - Names and exceptions stay editable while nobody has opened a ticket. Each page shows its own note explaining what a redraw changes.
  - The changed names and exceptions are held as a draft; autosave sends only title and rules plus the drawn names. A changed draft shows "Sortear de novo" and "Desfazer mudanças nos nomes".
  - After a successful redraw, the form state updates inside the `useActionState` action. On a failed draw or redraw, the ceremony flag is cleared and the page is revalidated.
  - `ShareTickets` is keyed by `drawId`, so the arrival animation replays after a redraw.
- **Send list.**
  - Each row is a grid with: the slip and name, an opened stamp, an "enviado" stamp you can click to undo, an icon-only copy button and "Enviar no WhatsApp".
  - Sent state is stored per code in localStorage.
  - A progress line reads "x de n enviados · y abriram". The ticket code is no longer shown.
- **Tabs move with their pages.**
  - Each sheet and its flag share a `paper-layer`. The tablist uses `aria-owns`.
  - In notebook mode, a flag turns with its page and then peeks out from behind.
  - Loose sheets rest in a small pile, and the chosen sheet slides out and lands on top.
- **Paper picker.** The exception selects use `appearance: base-select` and `::picker(select)`, behind `@supports`. Other browsers keep the native list.
- **Small fixes.** "Criar sorteio" no longer has a double space (the flex gap split the text). The footer link is now "Organize o seu sorteio", pointing to `/create`.
- **Race verified.** Edit names, open a ticket underneath, then "Sortear de novo": the notice reads "Alguém já abriu…", the flag is cleared and the pages lock. They show the drawn names, because a locked raffle renders from the committed lineup, never the draft. No draw button is left over.
- **Enter key.** A disabled, hidden default submit button sits first in the form, so Enter in any field no longer submits "Arquivar sorteio" (the next submit button once the draw button is gone).
- **Footer.** The archive row lost its own rule and is now a small line under the form. The footer link comes from `FooterCreateLink`: it's hidden on `/create` and reads "Organize outro sorteio" under `/sorteios`.
- **Select focus.** The select now gets a rounded pink focus outline.
- **Harness.** Run with `FLAGS="--lang=pt-BR --accept-lang=pt-BR"`; the app now picks its language from `Accept-Language`.

### Follow-up: i18n ids, inline corrections, budget sentence, exceptions page
- **i18n with stable ids.**
  - Every call is now `t('ns.id', 'English default', values)`.
  - Translations live in `src/lib/i18n/messages/{pt-BR,es}.json` and are formatted with `intl-messageformat` (ICU).
  - `src/lib/i18n.test.ts` parses the source with the TypeScript compiler. It fails on ids missing from a locale, ids no longer used, one id with two different defaults, and invalid ICU syntax.
  - Server errors throw `ValidationError(id, defaultMessage)`. `src/lib/form-fields.ts` maps error ids to the form field they concern.
  - The language in the URL (step 2) is still to do.
- **Corrections like a teacher's.**
  - The footer is gone; the only "Sortear" is on the Combinados page. Pressing it validates first, turns to the page with the problem, and circles the field in red with a handwritten note (`TeacherMark`). Server field errors do the same after the ceremony.
  - Repeated or too-long names get a hand-drawn red squiggle while typing (`LineSquiggles`). Only the newly added length of a squiggle is inked.
  - Names are capped at `MAX_NAME_LENGTH` (40).
- **Focus highlights.** All fields share the colorful hand-drawn box (`HighlightBox`). It is hidden on fields circled in red.
- **Date.** `SegmentedDate` follows the locale's order, separators and placeholders.
- **Budget.** Written as one sentence (`BudgetSentence`): [entre / até / a partir de / por volta de] [R$] [50] e [70]. `budgetKind` is now part of the exchange details.
- **Exceções page.** One sentence per person, "Ana não tira Bruno, Carla [+ outra pessoa]", with a "nos dois sentidos" toggle. Click a name to strike it out and remove it.
- **Notebook tabs** stay put in notebook mode and only change depth. Loose sheets still carry their tabs.
- **Local database** cleared of test raffles.
