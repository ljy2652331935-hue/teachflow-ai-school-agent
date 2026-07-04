# Decision: Audit And Privacy Before AI Or Database Expansion

## Date

2026-07-02

## Background

TeachFlow is moving from a hackathon-style demo toward a school-trial-ready AI teaching system. Before adding SQLite or real AI calls, the project needs clearer teacher visibility, session boundaries, and privacy notes so the demo does not imply production readiness.

## Options

- Add SQLite first to make persistence feel more real.
- Add real AI first to improve generated materials and student support.
- First complete visible audit, browser smoke verification, and privacy/security documentation.

## Final Choice

First complete visible audit, browser smoke verification, and privacy/security documentation.

## Reason

Teacher-controlled school software needs trust boundaries before broader capability. A visible audit panel and written MVP limits make it easier to demonstrate TeachFlow responsibly while still using deterministic local logic.

## Impact

- Teacher settings now show class-scoped audit events.
- `PRIVACY_NOTES.md` documents current guarantees, limitations, and hardening steps.
- SQLite and real AI integration remain future work until retention, authentication, and student-facing guardrails are clearer.

## Follow-Up Checkpoints

- Add automated browser-level tests for teacher/student access and role mismatch.
- Decide retention rules for local pilot data.
- Write production-auth notes before any real school pilot.
- Revisit SQLite or real AI only after the above checkpoints are addressed.
