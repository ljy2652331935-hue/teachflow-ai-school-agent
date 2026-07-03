# TeachFlow Formal Privacy And Security Review

Date: 2026-07-02

Scope: `outputs/teachflow-v0.1` / `teachflow-v0.3` local MVP.

This is an engineering privacy/security review, not legal advice. Before using TeachFlow with real students, a school, legal/compliance owner, and data-protection owner should review FERPA, COPPA, state/local rules, and the school's vendor process.

## External References

- U.S. Department of Education Student Privacy / PTAC: https://studentprivacy.ed.gov/
- FTC COPPA FAQ, especially school consent, data minimization, review/deletion, and retention guidance: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- NIST Privacy Framework: https://www.nist.gov/privacy-framework
- UK Department for Education, AI in schools and colleges: https://educationhub.blog.gov.uk/2025/06/artificial-intelligence-in-schools-everything-you-need-to-know/
- UK ICO Children's code guidance and resources: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/
- UNESCO guidance for generative AI in education and research: https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research
- Royal College of Psychiatrists warning on children turning to AI chatbots for mental-health support: https://www.rcpsych.ac.uk/news-and-features/latest-news/detail/2026/02/11/half-a-million-children-on-mental-health-waiting-lists-in-england-risk-turning-to-ai-chatbots-for-support--warns-rcpsych

## Readiness Verdict

- Anonymous local demo: acceptable after the fixes in this review.
- Controlled school trial with synthetic or alias-only data: conditionally acceptable only after the pilot checklist below is followed.
- Real student personal data or production deployment: not ready.

## Data Inventory

Currently collected in the MVP:

- Demo account role and class boundary.
- Anonymous student aliases such as `S002`.
- Class topic, learning state, assignment status, student questions, stuck-signal notes, and audit events.
- Student Check-in records: selected learning state, optional short note, private reflection, next learning step, optional teacher-visible learning summary, temporary learning support signal, and safeguarding flag.

Intentionally not collected:

- Real student names, emails, phone numbers, addresses, school IDs, health data, disciplinary data, family details, production credentials, or API keys.
- Mental-health diagnoses, counselling records, safeguarding case notes, medical labels, or full private student conversations for ordinary teacher access.

Current storage:

- Server-side local JSON workspace file: `data/workspace-state.json`.
- Browser local cache key: `teachflow.workspace.v1`.
- In-memory local demo sessions.

Current external sharing:

- None in the MVP. There is no real cloud AI provider call in the active app.

## Trust Boundaries

- Browser input is untrusted, including student questions and stuck-signal notes.
- The server session cookie is the source of role/class/student context.
- Query/body context must not override server-side session context.
- Teacher-visible pages must escape student-supplied text.
- School-admin views must remain aggregate-only unless a future decision explicitly changes that.

## Controls Already In Place

- Alias-only student model for the demo.
- HttpOnly `SameSite=Lax` local session cookie.
- Workspace API requires an authenticated session.
- Server derives role, class, and student alias from the session.
- Student mutation is scoped to the student's own alias.
- Teacher actions are class-scoped.
- School-admin workspace view hides individual students and student-level signals.
- Student Check-in teacher responses omit raw private notes and private reflections unless the student chose a teacher-visible learning summary; even then, the teacher gets a learning summary, not a full private conversation.
- Authorization failures and major actions are appended to audit events.
- Browser workflow test covers login, role gates, student assignment, stuck-signal sync, teacher analysis sync, audit visibility, and an XSS regression path.

## Findings

| ID | Severity | Status | Finding | Resolution / Required Action |
| --- | --- | --- | --- | --- |
| SEC-001 | High | Fixed | API authorization previously checked class/alias context but did not enforce a strict action-by-role matrix for every workspace action. | Added role/action authorization in `workspace-store.js`; added API tests blocking student workspace reset/write and teacher student-question impersonation. |
| SEC-002 | High | Fixed | Student stuck-signal notes were rendered into the teacher analysis panel and could become a student-to-teacher XSS vector. | Escaped workspace/student/signal fields in `teacher-prototype.js`; browser test now submits a malicious-looking note and verifies it does not execute. |
| SEC-003 | High | Open before real pilot | Demo login has no password, SSO, MFA, account lifecycle, or production session store. | Add real authentication or school SSO before real users. |
| SEC-004 | High | Open before real pilot | Mutating API routes do not yet use CSRF tokens. `SameSite=Lax` helps but is not a production CSRF strategy. | Add CSRF tokens or equivalent same-origin request validation for all mutation routes. |
| SEC-005 | Medium | Open | Workspace persistence is a local JSON file without database access controls, encryption at rest, backup policy, or deletion workflow. | Define retention/deletion first; then move to SQLite or a production-grade data store when the model stabilizes. |
| SEC-006 | Medium | Open | Browser `localStorage` can retain workspace state on shared devices. | Clear local workspace cache on logout/account switch and consider session-scoped storage for student devices. |
| SEC-007 | Medium | Open | Audit events are useful for demos but are not tamper-proof compliance logs. | Define audit retention/export, protect logs from ordinary app edits, and add admin review workflow. |
| SEC-008 | Medium | Open | Real AI integration is not connected yet; once connected, student prompts/responses can create privacy, safety, and accuracy risk. | Require teacher-controlled scopes, prompt/data minimization, logging rules, provider review, and student-facing safety guardrails before real LLM calls. |
| SEC-009 | Medium | Open | No rate limiting or free-text content length rules beyond the server body-size cap. | Add route-level size limits, request throttling, and validation for questions/stuck notes. |
| SEC-010 | Medium | Open | Security headers and CSP are not configured. | Add a minimal CSP, `X-Content-Type-Options`, frame restrictions, and other static-server headers. |
| SEC-011 | High | Open before real pilot | AI 学习关怀 / Student Check-in can be mistaken for mental-health support if wording, consent, and escalation rules are not school-approved. | Keep it framed as learning support only; add school-approved non-therapy notice, safeguarding lead role, escalation workflow, retention/deletion rules, and review before real student use. |

## Pilot Data Rules

For any school-facing trial before production hardening:

1. Use synthetic data or aliases only.
2. Do not enter real student names, emails, IDs, phone numbers, family details, health data, discipline notes, or special education records.
3. Keep all data local to the demo machine unless a school-approved data agreement exists.
4. Reset or delete local pilot data after the agreed retention period.
5. Tell teachers that AI output is draft support; the teacher remains the decision-maker.
6. Do not connect a real AI provider to student-facing support until a separate AI/privacy review is complete.
7. Do not use Student Check-in for counselling, diagnosis, discipline, grading, or behavioural profiling.

## Production Gate

Before TeachFlow handles real student personal data, complete at minimum:

- Real authentication/SSO and account lifecycle.
- CSRF protection and stronger session management.
- Database with access controls, backups, retention, deletion, and recovery plan.
- Security headers and input validation for all free-text paths.
- Tamper-resistant audit log and admin review workflow.
- Written privacy notice and school/vendor agreement review.
- Incident response plan.
- AI provider/data-processing review if any cloud model is used.
- Parent/school notice and consent process where required by the school and law.
- Safeguarding escalation workflow, designated role, crisis wording, and student-facing non-therapy notice if Student Check-in is used beyond synthetic/alias-only demo.

## Immediate Next Engineering Steps

1. Add CSRF protection for all mutation routes.
2. Clear browser workspace cache on logout/account switch.
3. Add security headers and a basic CSP to `server.js`.
4. Define local pilot retention and reset workflow.
5. Create a short teacher-facing privacy checklist for demos.
6. Draft Student Check-in consent, non-therapy, and safeguarding boundary copy for school review.
