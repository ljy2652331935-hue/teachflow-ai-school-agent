# Decision: Formal Privacy And Security Gate

## Decision Title

Keep TeachFlow limited to anonymous local demo until the privacy/security production gate is complete.

## Date

2026-07-02

## Context

TeachFlow is moving from hackathon-style prototype toward a school-trial-ready AI teaching system. It now has teacher/student pages, shared workspace sync, local demo sessions, role/class boundaries, audit events, and student free-text inputs. Because the product targets schools and students, privacy/security requirements must shape the development order before SQLite or real AI integration.

## Options

- Continue adding product features first and review privacy/security later.
- Allow only local anonymous demos while documenting risks.
- Treat the formal privacy/security review as a gate before real student data, SQLite migration, or real AI provider integration.

## Final Choice

Use the formal privacy/security review as a gate. The current app is acceptable for anonymous local demo, conditionally acceptable for controlled alias-only school trial, and not ready for real student personal data.

## Reasons

- Student data systems require stricter handling than normal demos.
- The current auth/session layer is demo-only.
- CSRF, retention/deletion, local cache handling, security headers, and production storage are not complete.
- Real AI integration would introduce provider, prompt, logging, consent, and student-safety questions.
- Teacher control and alias-only privacy are core TeachFlow principles.

## Impact

- Next engineering work should prioritize CSRF, browser cache clearing, security headers, retention policy, and pilot privacy checklist.
- SQLite should wait until the data model and retention rules are clearer.
- Real AI calls should wait until guardrails and provider/data-processing rules are defined.
- Product demos should use aliases or synthetic data only.

## Follow-Up Checkpoints

- `outputs/teachflow-v0.1/SECURITY_REVIEW.md` remains current.
- `PRIVACY_NOTES.md` matches the current code.
- Browser workflow tests continue to cover role gates and student-to-teacher sync.
- No real names, student IDs, account secrets, or production data are added to fixtures, docs, or devlogs.
