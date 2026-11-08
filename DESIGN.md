---
name: Amigos Secretos
description: O ritual do amigo secreto em papel de caderno e tinta azul.
colors:
  desk: "#e7dcc5"
  desk-line: "#b8a98d"
  paper: "#fffefb"
  ink: "#2146a0"
  ink-deep: "#173779"
  text: "#353b47"
  muted: "#5b6069"
  rule: "#c4d4ec"
  margin: "#d79897"
  error: "#983c32"
typography:
  display:
    fontFamily: "Caveat, cursive"
    fontSize: "54px"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-.015em"
  headline:
    fontFamily: "Caveat, cursive"
    fontSize: "35px"
    fontWeight: 500
    lineHeight: 1.05
  written-name:
    fontFamily: "Caveat, cursive"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.05
  revealed-name:
    fontFamily: "Caveat, cursive"
    fontSize: "clamp(20px, 13cqw, 52px)"
    fontWeight: 500
    lineHeight: 1
  body:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 550
    lineHeight: 1.5
  button:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 550
    lineHeight: 1.5
rounded:
  field: "3px"
  button: "4px"
  paper: "0px"
  circle: "50%"
spacing:
  compact: "8px"
  control: "12px"
  field: "16px"
  section: "24px"
  notebook-field: "25px"
  page-gutter: "28px"
  paper-rule: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#fff"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "11px 19px"
  button-primary-hover:
    backgroundColor: "{colors.ink-deep}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "11px 19px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "11px 13px"
    width: "100%"
  name-entry:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.paper}"
    padding: "10px 17px"
  name-slip:
    textColor: "{colors.ink}"
    typography: "{typography.written-name}"
    rounded: "{rounded.paper}"
    padding: "5px 4px 5px calc(20% + 12px)"
  notebook:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.paper}"
    padding: "30px 28px 29px 66px"
  navigation:
    textColor: "{colors.text}"
  badge:
    textColor: "{colors.muted}"
  folded-ticket:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.paper}"
---

# Design System: Amigos Secretos

## Overview

**Creative North Star: "O ritual do papelzinho"**

Notebook pages and loose slips make the familiar amigo secreto ritual tangible: write with a blue ballpoint pen, tear a horizontal strip by hand, fold it twice along vertical creases and open it to discover a name. The material world is light kraft with visible fibers, near-white ruled paper and imperfect blue writing. Shadows, creases and small rotations describe actual pieces of paper.

Caveat carries handwriting; Public Sans keeps controls and instructions clear. Copy is direct, conversational Brazilian Portuguese. The organizer works on an open notebook, while the recipient gets a focused paper interaction. The confirmed background is pale, desaturated kraft; gray and orange backing are rejected.

**Key Characteristics:**

- Light kraft backing with visible natural fibers.
- White ruled notebook paper, a red margin and jagged hand-torn edges.
- Subtle blue ballpoint coverage with small pigment skips and pressure variation.
- Two deliberate opening steps with touch, tap and keyboard access.
- Plain pt-BR instructions and legible Public Sans controls.

## Colors

A blue ballpoint accent sits on white notebook paper over pale natural kraft. The frontmatter records the CSS source values; the desk's rendered appearance also depends on its texture and light overlay.

### Primary

- **Ballpoint Blue** (`ink`): handwriting, actions, focus rings and active states.
- **Deep Blue Ink** (`ink-deep`): hover emphasis and stronger feedback text.

### Secondary

- **Notebook Red** (`margin`): the vertical margin on the organizer's notebook, subordinate to the blue writing.
- **Ruled Blue** (`rule`): horizontal writing lines on notebook sheets and open slips.

### Neutral

- **Light Kraft** (`desk`): body backing beneath the photographic texture.
- **Kraft Divider** (`desk-line`): quiet section boundaries on the backing.
- **Notebook White** (`paper`): sheets, slip faces and field fills.
- **Graphite Text** (`text`): functional copy.
- **Soft Graphite** (`muted`): supporting instructions and secondary metadata.
- **Dry Red Ink** (`error`): errors and destructive text.

**The Light Kraft Rule.** Keep the photographic fibers visible under the light overlay. Preserve the pale, desaturated backing chosen by the user.

The body repeats `/textures/kraft.webp` at (768px × 768px), beneath a uniform `rgb(249 244 226 / 72%)` overlay. The generated texture has a provenance sidecar at `/public/textures/kraft.webp.json`. Preserve this composed treatment; the underlying image alone is darker than the chosen final background.

## Typography

**Display Font:** Caveat, with cursive fallback. Self-hosted variable font, weights (400–700).

**Body Font:** Public Sans, with sans-serif fallback. Self-hosted variable font, weights (100–900).

**Character:** Written content feels like blue pen on a physical sheet; interface copy stays steady and readable. Both fonts load through `next/font/local` with swap behavior; licenses live beside the fonts in `public/fonts`.

### Hierarchy

- **Display:** the base page heading uses the frontmatter display role; the home letter grows to (58px), and page headings adapt to (44–47px) on narrower screens.
- **Headline:** the base section role varies with paper context: notebook (39px / 48px), participant heading (36px), sharing heading (37px).
- **Written name:** settled participant labels use the frontmatter written-name role, reduced to (22px) on phones. Animated strip writing uses (28px), or (26px) on phones. Name entry uses (25px / 30px), notebook title (28px / 32px), and notebook rules (23px / 32px).
- **Revealed name:** the physical strip sizes the Caveat name to its available width and can split long multiword names over two ruled baselines. The frontmatter reveal role describes the CSS fallback; the WebGL name is drawn into a texture and sized by `layoutName`, with a matching transparent, selectable DOM heading once fully open.
- **Body / Label / Button:** use the frontmatter roles. Supporting functional text commonly uses (10–13px); do not apply the decorative ink filter to it.

**The Ink Boundary Rule.** Apply pigment loss to the writing, keeping paper fills and ruling on unfiltered wrappers. Disable ink filtering when more contrast is requested, or on the specific lettering being selected.

The SVG filter combines fine coverage and broader pressure variation while keeping text selectable. Coverage has a (0.65) alpha floor with a (0.35) slope, and pressure uses a (0.6) intercept, keeping wear subtle. Selection marks only overlapping lettering or selected field contents; unselected writing keeps its texture. The participant textarea is transparent; its wrapper owns the paper and lines. Shared names have an inner filtered span inside the unfiltered white slip. The reveal texture paints its own restrained ink irregularity into the paper faces.

## Layout

The standard shell and header center within (1120px), with desktop gutters (28px). The footer is capped at (1064px). Creation places notebook and participants in two columns (1.22fr / 1fr), separated by (44px); at (1120px) the gap becomes (30px), and at (850px) it becomes (24px). At (650px) the notebook and participants stack in task order with a (35px) gap and (22px) page gutters. At (390px), gutters become (18px). Wide layouts add vertical breathing room at (1400px).

The notebook aligns writing to a (32px) ruling rhythm, with a single red margin. Participant slips use two columns on wide desktop, one at the intermediate breakpoint, then two once the full-width phone section stacks. Restrictions expand inline. Form actions follow the content and become full-width stacked buttons on phones. Sharing rows become vertical at (650px), preserving each person's message actions.

Private-ticket layout centers a single interaction within (760px); its rules sheet caps at (550px). The reveal is mobile-first in task structure: one paper object, one next step, then the private name. The horizontal strip uses a full-width aspect ratio (3.9:1) and width `max(160px, min(420px, scene width − 32px))`. The scene is (230px) tall, reduced to (200px) on phones; the canvas extends (40px) above and below it to accommodate lifted flaps and shadows. Keep the name on the strip, with only the name visible once open; instructions and progress remain outside it. Use content fitting and wrapping rather than truncating names.

## Elevation & Depth

Depth is material: ambient shadows below sheets, displaced backing layers, metal notebook rings, lit fold hinges and thin crease gradients. Small rotations vary loose slips without disrupting readable controls. Layered white and warm underside faces convey thickness.

### Shadow Vocabulary

- **Paper:** `drop-shadow(var(--shadow-paper))`, using the source value `2px 8px 9px rgb(64 53 38 / 12%)`; apply to an outer wrapper so a clipped torn edge can cast a shadow.
- **Sharing slip:** `drop-shadow(1px 3px 3px rgb(53 47 35 / 14%))`.
- **Settled participant packet:** `drop-shadow(1px 3px 3px rgb(53 47 35 / 18%))`.
- **CSS ticket fallback:** `drop-shadow(2px 6px 7px rgb(64 53 38 / 18%))`.
- **Physical reveal:** transparent WebGL with a soft PCF shadow floor (color `0x4a361c`, opacity `0.2`), directional light and ambient light calibrated to preserve the paper white. Each quarter has one shared geometry with separately culled front and back faces.

**The Physical Paper Rule.** Use creases, torn silhouettes, layered sheet edges and ambient shadows to explain the paper object and its state.

The reveal uses a critically damped spring with stiffness (64), carrying drag-release velocity into the remaining movement. Reduced motion snaps its progress directly to the target; global CSS removes transitions and reduces CSS animations to (1ms). Optional vibration pulses for (10ms) when a fold settles open. Participant strips use separately seeded tear, hinge and settle timings; their folded packet stays at (0.8) scale with a seeded tilt within (±4.5°).

## Shapes

Paper has square underlying geometry and irregular hand-torn edges. Notebook, sharing slips and the reveal fallback use `--tear`; participant panels use ID-seeded torn polygons; the physical reveal draws its own seeded outline into the front/back textures. Preserve fine jagged edges, layered thickness and gentle crease relief. Sheets, slips and letters can rotate slightly; forms and navigation retain stable alignment. The private ticket is a horizontal strip folded into quarters, then opened to half and full width through two vertical fold operations. It has no decorative corner or writing on its closed face.

Functional fields have restrained corners from the field radius token; buttons use the button radius token. Circular marks belong to notebook rings, status dots and the two-step progress indicator. Avoid introducing pill-shaped paper containers.

## Components

### Buttons

Compact Public Sans controls keep the organizing work clear. Primary actions use blue ink with white text, the frontmatter padding and a minimum height (44px). Hover deepens the fill and adds a soft shadow; active fill is `#102c68`. Secondary actions use transparent fill, blue text and a muted blue border, with a pale blue hover fill. Small variants use (9px 13px) padding and minimum height (40px), raised to (44px) for coarse pointers. Disabled primary actions use a gray fill and no shadow. Visible keyboard focus is a (2px) blue outline with (5px) offset.

### Inputs / Fields

General fields use paper fill, blue text, a thin gray outline and frontmatter field padding. Focus is a (2px) blue outline with (3px) offset. Notebook fields are transparent, borderless handwriting aligned to the ruled sheet. The names entry puts ruling and fill on its wrapper; focus outlines the wrapper and the transparent textarea carries the ink texture. Placeholders remain blue-gray. Disabled fields retain (0.8) opacity. Error, neutral and success notices pair readable text with distinct pale fills; errors use an alert role.

### Navigation

The blue Caveat wordmark includes an inline notebook drawing and irregular underlines. Its slight rotation belongs to the logo, while the Public Sans navigation stays level. Header links expose the raffle list and bordered create action. On narrow screens navigation wraps; below (390px) it takes a separate full-width row. The list's tabs use a thin blue underline for selection. Preserve the skip link and visible focus states.

### Notebook and Paper Containers

The organizer notebook combines a torn white page, red margin, blue horizontal ruling, a displaced back sheet and nine metal rings. The isolated notebook wrapper keeps rear ring arcs at z-index (0), the opaque sheet at (1) and front arcs at (2), so the back metal passes underneath the page. Labels have white backing to interrupt lines locally. Preserve separate paper, content and shadow layers. Management cards are loose raffle notes, with written titles and quiet status dots; they use a pale blue-white hover surface. Empty states are stacked paper, with a short written prompt.

### Participant Slips and Sharing

New participants tear free as horizontal strips, fold twice and settle into small paper packets. `ParticipantSlip.tsx` and its CSS module keep the paper animation separate from the accessible label and removal control. The label remains present from the first frame, wraps long names and establishes row height; the paper stays a fixed (58px) band. The remove button sits above the animated paper and remains usable throughout.

Participant IDs seed edge shapes, drift, tilt and timing. The tear takes (300–430ms), the first fold (420–600ms), the second (380–540ms), and settle (260–380ms), with individual start jitter (0–170ms). Batch stagger is `min(85ms, 1100ms / count)`. Each component freezes its initial stagger; later additions do not replay existing names. On completion, the CSS 3D tree is replaced by two static packet layers. Existing, locked and reduced-motion participants render static immediately. Preserve separate nested hinges and avoid filters or clipping on ancestors that would flatten the 3D layers.

Shared slips keep white paper on the strong element and texture only its inner text span; a quiet monospace ticket code sits below. Each person has explicit copy and WhatsApp actions. Successful copy changes its own button to a checkmark and “Copiada” for (2.5s), with a desktop minimum width (158px) to avoid layout movement; phones retain equal flexible actions. A polite screen-reader status names the copied person. Clipboard failure reveals a selectable manual-copy textarea and concrete guidance. The “Já enviei” checkbox is screen-local, with no fabricated delivery state.

### Two-Fold Ticket

`HiddenName.tsx` loads `paper-strip-3d.ts` dynamically. `paper-fold.ts` supplies continuous fold kinematics over progress (0–2); `paper-texture.ts` creates canvas front/back textures. The renderer uses four quarter meshes with hinged, slightly bowed geometry and a (0.7px) layer gap. The strip's lettering lives on shared physical UVs, so each part moves with its face as the paper opens. The reverse carries a faint ink ghost at roughly (6%) total alpha; viewing the back face mirrors it naturally. The scene tilts about (−1.43°), with no HTML-in-canvas dependency.

Two vertical fold operations open quarter → half → full. Horizontal dragging scrubs the active fold in either direction. Release opens after (40%) progress or a quick flick; otherwise the spring returns to that fold's start. Tap, Enter and Space retarget the same spring smoothly, including during motion. Mostly vertical movement beyond (10px) abandons the gesture and `touch-action: pan-y` preserves page scrolling. Pointer cancellation returns to the fold's start. Two progress circles and Portuguese instructions announce state outside the strip.

The name enters the DOM only after the strip settles fully open. A matching transparent heading overlays the texture for native selection, copy and focus; the fallback heading uses ordinary blue text. The focused name receives no forced scroll. Demo refold reverses the motion and returns focus to the paper button. Optional haptics are never required.

If WebGL fails, its context is lost, or the dynamic renderer is loading, a torn CSS strip occupies the same scene. Once ready in fallback mode it opens in the same quarter → half → full sequence by tap or keyboard and shows the real name. Rendering is on demand during motion, drag, resize and texture readiness, with pixel ratio capped at (2); there is no idle render loop. Unmount disposes frames, observers, listeners, textures, geometries, materials, shadow maps and the renderer. Respect reduced motion in both the spring and CSS paths.

## Do's and Don'ts

### Do:

- **Do** keep kraft light and visibly fibrous behind near-white paper.
- **Do** use Caveat for written names and Public Sans for functional labels and instructions.
- **Do** keep paper backgrounds outside the ballpoint filter.
- **Do** preserve both vertical folds, with tap and keyboard alternatives to dragging.
- **Do** retain visible focus, live status messages, reduced-motion handling and coarse-pointer targets.
- **Do** write concrete, conversational Brazilian Portuguese.

### Don't:

- **Don't** replace the chosen backing with gray or orange kraft.
- **Don't** replace the paper ritual with gift mascots, generic dashboard cards, serif marketing headings or eyebrow labels.
- **Don't** make vibration or dragging necessary to reveal a name.
- **Don't** imply that opening WhatsApp confirms delivery; the sent checkbox is local to the current screen.
- **Don't** treat the paper as a rounded app card or apply ink failures to its surface.
