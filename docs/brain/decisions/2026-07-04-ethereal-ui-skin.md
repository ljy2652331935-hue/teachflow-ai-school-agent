# Decision: Ethereal AI UI skin from teachflow-ui.zip

Date: 2026-07-04

## Context

User provided reference package `teachflow-ui.zip` (React/Vite mock) with "Ethereal AI Intelligence" design: white/slate canvas, blue primary, gradient AI orb, collapsible sidebar nav, bottom command bar.

Prior `DESIGN_SYSTEM.md` section 4 deferred color unification.

## Decision

Adopt the reference visual system across `teachflow-school-live` via shared CSS tokens, without migrating to React or adding new product features.

## Implementation

- `design-tokens.css` — shared CSS variables
- `ethereal-ui.css` — orb, command bar, overview hero, wave logo
- Teacher/student/admin/login pages link tokens first
- `DESIGN_SYSTEM.md` section 4 updated to describe Ethereal skin

## Constraints preserved

- No floating docks
- Metric cards remain number + short phrase
- Boundary copy stays in sidebar + settings
- One primary CTA per screen

## Not in scope

- Framer Motion page transitions
- Full Overview spectrum bar / numbered action cards on every channel (only overview orb hero for now)
- Replacing plain JS architecture with React
