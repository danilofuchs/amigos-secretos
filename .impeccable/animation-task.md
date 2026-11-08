# Build a convincing 3D amigo secreto paper reveal

You are the delegated animation specialist, explicitly requested by the user as Claude Opus 5.5 through Orca. Work in the CURRENT checkout: /Users/danilo/dev/elefante-branco. This is a shared dirty workspace; all existing changes belong to the user/coordinator. Do not revert, commit, push or deploy anything. Preserve unrelated work.

## Deliverable

Replace the current flaky paper reveal with a crafted, performant Three.js 3D folded paper strip. The user is actively iterating on the site locally. Finish working code, verify actual animation and write a completion report to .impeccable/animation-result.md. A nonzero check exit is a failed task until fixed, not success.

## Exact latest user requirements (these override stale design docs)

- The usual amigo secreto slip is HORIZONTAL, a small rectangle of hand-torn notebook paper with ONLY the person's name on it. No “você tirou”, no tagline on the paper, no square name card.
- TWO VERTICAL folds: full strip folded in half, then in quarters. Opening goes quarter → half → whole. The user superseded an earlier three-fold concept.
- The name is written ON the paper and must progressively reveal as the actual paper unfolds. It cannot pop in as a separate overlay after the animation.
- The reverse side should show a FAINT, mirrored bleed-through hint of the name. As it opens you gradually suspect who it is. Keep it subtle, like a thin real notebook sheet, not glass or transparent UI.
- Proper depth ordering and hinges, no duplicate DOM planes or coplanar flicker. The previous CSS animation grew a sheet underneath a turning flap and visibly overlaid itself; the user rejected that.
- User suggested Three.js and specifically asked for this Claude Opus 5.5 delegation.
- Ticket reveal is 100% MOBILE-FIRST. Creation is desktop-first but also phone-capable. Drag gestures, tap and keyboard alternatives, supported haptic feedback and reduced-motion support must work. Keep native vertical page scroll working outside/through vertical gestures; horizontal intent opens the vertical fold.
- Background is LIGHT kraft paper with visible fibers, NOT gray or orange. White paper, BIC blue writing, rough torn edges and gentle physical creases/shadows. Already implemented; preserve it.
- Writing has SUBTLE ink irregularity. Earlier SVG filter was far too broken; the user asked to tune it down. Current InkFilter values are the latest tuned reference.
- Text selection highlights must remain normal. The coordinator is handling a global selection/ink-filter fix; do not change it.

## Scope and boundaries

You MAY edit:
- src/components/HiddenName.tsx (the reveal component)
- src/lib/paper-canvas.ts (current interim 2D renderer; may remove if replaced)
- New animation-specific helper files under src/lib/ or src/components/
- src/app/globals.css ONLY rules for .paper-ritual, .strip-*, .fold-guide, .fold-progress, .demo-caption, .refold, and their corresponding responsive rules. Do not restyle the rest of the app.

You MUST NOT edit:
- Package manifests/lockfiles (Three.js 0.187.0 and matching @types/three are ALREADY installed)
- Backend, actions, database, code generation, sharing, session, route logic
- InkFilter.tsx, global selection behavior, product/brand copy or fonts
- PRODUCT.md, DESIGN.md, .impeccable/design.json, design briefs (coordinator will sync docs after final review)

The current HiddenName props are { name: string; demo?: boolean }. Preserve them. Home renders <HiddenName name="Marina" demo/> as a labeled example, and the private ticket route passes its actual assigned recipient. Keep Portuguese instructions outside the paper. Keep result accessibility and focus behavior; native name selection/copy at final rest is desirable if achievable without duplicating visible lettering.

## Existing context

- Next.js 16.4.5 / React 19.3.1 / TypeScript 6 / Tailwind 4.3.5 / Node 24 / pnpm 12.
- Self-hosted Caveat handwriting and Public Sans; CSS --font-handwriting and --ink (#2146a0), --paper (#fffefb).
- public/textures/kraft.webp is the existing generated backing. No image assets are needed for 3D; use a canvas texture for the exact recipient name and white notebook paper. Wait for the actual local handwriting font before texture rendering.
- Current local app runs at http://localhost:3600. Do not stop its server. Start another port only if needed.
- Coordinator already shortened ALL local test raffle/ticket codes to 12 case-sensitive base62 characters and removed Upstash. Old four-/48-character links intentionally need not work. Use the home demo for animation verification, avoiding stale saved test URLs.
- Read AGENTS.md and applicable Next.js docs under node_modules/next/dist/docs before implementation.
- PRODUCT.md carries user truth. DESIGN.md is being updated separately; latest bullet requirements here win over stale references to three folds.

## Implementation expectations

Use actual paper geometry and hinges with front/back CanvasTexture(s), so the name follows the surface across every frame. Four strip quarters and two fold operations are a reasonable model; choose a better approach if needed. Prevent z-fighting with proper layer spacing/depth order. Keep torn edges, subtle paper shading, crease behavior and ghost text anchored to the same UV layout.

Lazy-load Three.js for the reveal and clean up renderer, geometries, materials, textures, observers and RAF. Cap pixel ratio for phones and render only while animating/dragging/resizing, not forever. Maintain a graceful readable fallback if WebGL is unavailable. Do not require the new HTML-in-Canvas API: Chrome 157 has it, but Safari/Firefox support is not sufficiently confirmed for this mobile-first product.

A drag should scrub the hinge smoothly and continue from its current angle on release, not restart at zero. Tap/key can run the same motion. Honor prefers-reduced-motion. navigator.vibrate is optional and unsupported browsers must work normally. Do not add sound or unrelated effects.

## Validation and report

Run pnpm lint, pnpm typecheck and pnpm build after changes. Exercise the actual home demo in a real browser at desktop and a 390px phone viewport (Orca browser CLI is available; load its browser reference before using). Verify mid-motion appearance, both folds, gradual name visibility, faint reverse text, repeat/refold, rapid input, drag cancellation, resizing, keyboard and reduced-motion behavior as available. Do not treat a single final-state screenshot as proof that the motion works.

Save useful mid-fold/final captures under .impeccable/review if practical. Report the model actually used, files changed, checks and browser evidence, and any real limitations. This direct Orca launch has no orchestration dispatch: do NOT call worker_done or ask. Write your completion report to .impeccable/animation-result.md so the coordinating Codex chat can read it; put a clear final status and model at the top. The coordinator will handle integration and the final user reply. Do not ask the user to choose implementation details; solve them within this brief.
