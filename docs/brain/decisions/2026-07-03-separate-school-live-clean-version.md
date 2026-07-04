# Decision: Separate School-Live Clean Version

## Date

2026-07-03

## Background

The project had a rich demo app in `outputs/teachflow-v0.1` with seeded classes, students, test accounts, and demo workflows. The next goal is no longer a fixed demo. The user wants a cleaner version where a teacher can register, create a class, send a classroom link, and students can join through that link.

## Options

1. Mutate `outputs/teachflow-v0.1` directly and remove demo data.
2. Create a sibling clean version while preserving the demo app.
3. Start a brand-new app from scratch.

## Final Choice

Create `outputs/teachflow-school-live` as a sibling clean school-trial version, while preserving `outputs/teachflow-v0.1` as the legacy demo/reference app.

## Reasons

- Preserves the older demo for comparison, regression work, and reference behavior.
- Allows the clean version to use different defaults, tests, and browser localStorage keys without breaking demo assumptions.
- Keeps the school-trial flow focused on teacher registration, classroom invite links, and student self-join.
- Avoids a risky one-shot cleanup of every demo-specific screen before the core registration flow is proven.

## Impact

- Future school-trial work should default to `outputs/teachflow-school-live`.
- Future demo-regression work can still use `outputs/teachflow-v0.1`.
- Documentation and AGENTS rules must distinguish the two folders.
- Some shared legacy files in the school-live copy may still need copy/UI cleanup over time.

## Follow-up Checkpoints

- Confirm two-window manual testing works: teacher registers, student joins, student sends signal, teacher sees it.
- Remove remaining demo copy from deeper school-live screens.
- Add dev-only reset for repeated clean testing.
- Revisit authentication and persistence before any external pilot.
