# TeachFlow Privacy And Security Notes

Last updated: 2026-07-02

Formal review: see `SECURITY_REVIEW.md`.

## Current MVP Guarantees

- TeachFlow uses anonymised student aliases such as `S002`.
- Demo accounts do not require real student names, emails, phone numbers, or school IDs.
- The local workspace API requires a demo session before returning class data.
- Teacher sessions can read and update the configured class workspace.
- Student sessions are scoped to the student's own alias and cannot reset or overwrite the whole workspace.
- School-admin sessions are read-only in this MVP and do not receive individual student details.
- API authorization uses a role/action matrix for workspace read, write, reset, assignment, question, and stuck-signal actions.
- Teacher-visible student text is escaped before rendering in the teaching analysis panel.
- Authorization failures are recorded as audit events.
- Student submissions, stuck signals, questions, login/logout, and workspace resets are recorded in `auditEvents`.
- Student Check-in supports private reflection, ask-AI-first, and teacher-visible learning summaries.
- Teacher-scoped workspace responses omit Student Check-in raw private notes and private reflections; teachers see only summaries the student chose to share.
- Teachers can review class-scoped audit events in the teacher settings page.

## Current Limitations

- The current session system is for local demo use only.
- There is no password system, external identity provider, SSO, MFA, or production session store.
- Sessions are held in server memory and disappear when the local server restarts.
- Workspace data is stored in a local JSON file, not an encrypted production database.
- Browser `localStorage` can retain demo workspace state on a shared device.
- The audit log is local-demo scoped and is not tamper-proof.
- CSRF protection, rate limiting, content-length rules, security headers, upload scanning, and retention policies are not production-ready yet.
- The system is not ready for real student personal data.
- AI 学习关怀 is not a mental-health service. The current MVP does not include a real safeguarding lead role, school escalation workflow, crisis workflow, or counsellor handoff.

## Data Rules For Pilots

- Use aliases only.
- Do not paste real names, emails, phone numbers, addresses, student IDs, health data, disciplinary notes, family details, or other sensitive personal data.
- Do not store API keys, tokens, private account details, or school production configuration in demo files or docs.
- Use temporary learning-state language such as `needs support` or `stuck on diagram mapping`; do not label a student as weak, bad, incapable, or permanently low ability.
- Treat wellbeing/check-in signals as temporary learning support indicators, not diagnoses.
- Do not enter real health, counselling, safeguarding, family, discipline, or special category data into the local demo.
- Reset or delete local pilot data after the agreed retention period.

## Teacher Control Rules

- AI drafts; teachers decide.
- AI-generated materials should remain editable before approval.
- Teacher approval should happen before export or publication.
- Every diagnosis should be traceable to student evidence.
- Every intervention should link back to diagnosed misconceptions.
- Student-facing AI support must remain bounded and teacher-reviewable before any real AI provider is connected.
- Student Check-in can help students express learning frustration, but it must not diagnose depression, anxiety, ADHD, or any other condition.
- If safety-risk language appears, TeachFlow should encourage contacting a trusted adult and, in a real deployment, follow the school's safeguarding process.

## Next Hardening Steps

1. Add CSRF protection for all mutating API routes.
2. Clear browser workspace cache on logout/account switch.
3. Add security headers and a basic Content Security Policy.
4. Define local pilot data retention and deletion workflow.
5. Add route-level size limits and rate limiting for free-text notes/questions.
6. Define safeguarding roles, escalation paths, student consent wording, and non-therapy notices before expanding AI 学习关怀 beyond local demo.
7. Replace JSON persistence with SQLite or a production database when the data model stabilizes.
8. Add production authentication notes before any real school pilot.
9. Define guardrails and teacher-review requirements before connecting real AI responses to student-facing support.
