# Amigos Secretos

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People organizing an amigo secreto with friends, relatives or colleagues, and participants opening their individual tickets. The interface is in Brazilian Portuguese. Messages are shared with WhatsApp contacts.

## Product Purpose

Create and manage multiple sorteios, agree on editable rules, prevent unwanted pairings and reveal one recipient privately to each participant.

## Operating Context

The user described the real ritual: write names with a blue BIC pen on notebook paper, tear or cut the paper by hand, fold the paper and hand each folded slip to a participant to open. This ritual is the confirmed visual and interaction reference.

## Capabilities and Constraints

Preserve creation, participant lists and bulk paste, configurable rules, directional or mutual exclusions, drawing, private tickets, WhatsApp copy/share, management and archiving. Name and domain: Amigos Secretos, amigossecretos.vercel.app. The existing Next.js implementation runs locally on port 3600. Management currently uses an organizer cookie; no login or account recovery has been requested. Production database configuration remains separate from this design task. Do not fabricate testimonials, usage counts or delivery confirmations.

## Brand Commitments

The user explicitly requested exploring skeuomorphism using letters, notebook paper, blue ballpoint writing, hand-torn jagged slips and two vertical folds. Replace the previous cream/green generic gift-themed marketing look. The user rejected a gray background and specified light kraft paper with visible fibers, explicitly lighter and less orange. Ballpoint writing must have uneven ink coverage and small texture failures. After reviewing the implementation, the user requested reducing those failures: keep the strokes mostly continuous with only subtle pressure and ink variation. The Humanizer skill governs copy editing: natural Brazilian Portuguese and concrete instructions over slogans. Creation is desktop-first but must work on phones; individual results are 100% mobile-first. The user requested mobile animations, possible drag gestures and haptic feedback when supported. Functional controls must remain legible and usable. The user chose code-first iteration directly in the local site, rather than image comps.

## Product Principles

- Make the familiar paper ritual tangible in the reveal.
- Keep organizing and sharing straightforward.
- Preserve private results and configurable rules.
- Make the mobile experience usable for tickets received over WhatsApp.

## Latest confirmed behavior

The user clarified the ticket is a horizontal torn strip containing only the name, with two vertical folds: quarter → half → full. Text must be attached to the paper and reveal continuously while unfolding. The reverse shows a faint mirrored bleed-through hint. Three.js was suggested and a Claude Opus 5.5 Orca worker explicitly requested for 3D animation. New raffle and ticket codes are 12 case-sensitive base62 characters; old links and Upstash compatibility are not required because nobody currently uses the app. Text selection must retain its normal solid highlight; temporarily suppress ink filtering during selection.

Selection suppresses ink wear only on elements containing actually selected characters, not the whole page. The main CTA follows the angle of its paper sheet. Copy feedback appears inside its own fixed-width button for 2.5 seconds. Spiral bindings occlude their rear arc beneath the paper. New participant strips must tear and fold at independently staggered timings, with a usable name/remove control and reduced-motion alternative.
