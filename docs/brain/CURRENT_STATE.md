# Current State

Last updated: 2026-07-03

## Current Active Version

- School-trial app path: `outputs/teachflow-school-live`
- School-trial package name: `teachflow-school-live`
- Usual school-live URL: `http://127.0.0.1:5175/login.html`
- Legacy demo app path: `outputs/teachflow-v0.1`
- Legacy demo package/version: `teachflow-v0.3`
- Legacy demo URL: `http://127.0.0.1:5174/`

## What Works Now

- A clean school-trial copy now exists at `outputs/teachflow-school-live`.
- The school-live app starts from an empty workspace with no demo accounts, classes, students, questions, stuck signals, messages, or teacher actions.
- Teachers can register from `login.html`, create a class, and receive a classroom join link.
- Students can open the classroom join link, register, and receive an anonymous alias such as `S001`.
- The school-live workspace uses a separate browser localStorage key, `teachflow.school-live.workspace.v1`, so it does not reuse old demo browser cache.
- The teacher course page shows the real class, invite link, and actual joined-student roster.
- The teacher and student home/material pages now avoid the old fixed demo first-screen data in the school-live app.
- The school-live package has dedicated registration/invite and system-integrity tests: `tests/school-live-registration.test.js` and `tests/school-live-system-integrity.test.js`.
- Deterministic engines for diagnosis, intervention, control layer, memory, student portal, understanding map, school agent, and dual teacher/student agents.
- Teacher prototype with simplified left-channel navigation, unified `教学分析` workspace, material creation, approval/export, role boundary display, and class-scoped audit log panel.
- Student prototype with learning materials, assignment/question flow, a single learning question window, AI learning support, Student Check-in / AI 学习关怀助手, stuck-signal submission, and student-only boundary display.
- Student Check-in now includes a private AI Wellbeing Coach chat for learning pressure support; it supports reflection and coping steps, but it is not a mental-health diagnosis, doctor, therapy, or crisis service.
- Student AI 学习支持 no longer duplicates the general learning chat box; study questions now belong in the dedicated 问题窗口, while support focuses on analysis, memory, and stuck-signal sharing.
- Teacher prototype includes Teacher Inbox and modal Student Support Profiles based on shared check-ins, using temporary learning-state language rather than diagnosis.
- Teacher prototype now includes a Teams-style `消息中心` with right-bottom activity reminders, per-student message threads, and teacher replies through the shared workspace API.
- Teacher prototype now includes a first Teacher Agent Orchestrator: a protected `GET /api/teacher-agent/briefing` total API that reads the unified data layer and returns teacher priorities, misconception clusters, intervention suggestions, message drafts, source signals, and safety notes.
- Teacher Agent now has an executable action layer: teacher-approved support messages, assigned materials, short follow-ups, and dismiss/handled actions are persisted in the shared workspace and audit trail.
- Teacher Agent now includes a first learning outcome evaluation layer that compares teacher-approved actions with later student signals and summarizes improved / needs-follow-up / monitoring / waiting states.
- Teacher `教学分析` can now be opened directly with `teacher-prototype.html#analysis`, and its `成效回流` summary is visible near the top with details in a modal.
- Student prototype now includes `老师消息` with a teacher-message dock and shared message history for learning-related student/teacher conversation.
- Student prototype now includes a first Student Agent Orchestrator: protected `/api/student-agent/*` routes for personal briefing, controlled learning answers, stuck-draft generation, and student-confirmed share-to-teacher.
- Live LLM wiring now exists behind the backend: `/api/ai/status`, `/api/ai/teacher-agent`, `/api/ai/student-agent`, `/api/ai/material-generator`, and `/api/ai/message-draft`. These routes call OpenAI when configured and fall back to local deterministic Agent behavior when unavailable.
- School-admin prototype with aggregate pilot metrics, multi-class comparison, class summaries, school-agent recommendations, system architecture, pilot roadmap, and audit summary.
- Shared workspace data layer syncs student stuck signals, questions, and assignment status into teacher analysis.
- Shared workspace data layer now exposes `schoolAggregate` for school-admin views without individual student rows.
- Default demo data now includes three active class spaces: `高二物理 A 班`, `高一物理 B 班`, and `AP Physics`.
- File-backed workspace API persists data in `data/workspace-state.json`.
- Local demo login creates an HttpOnly session cookie for teacher, student, or school-admin accounts.
- Cloud-demo deployment is prepared with `render.yaml`, `npm start`, cloud host binding, and two explicit test identities: `test-teacher` and `test-student-s002`.
- Manual two-account testing now uses `testMode.enabled` in `data/workspace-state.json` so clean empty interaction collections stay empty instead of being refilled from fallback demo data.
- Workspace API requires an authenticated session and uses server-side class/alias context.
- Role/action authorization now blocks student workspace reset/write, teacher student-question impersonation, and school-admin mutation.
- Teacher-side rendering escapes student-supplied stuck-signal content.
- School-admin workspace view is read-only and aggregate-only.
- Audit events record login/logout, workspace resets, student submissions, stuck signals, student questions, teacher/student messages, and authorization failures.
- Browser workflow smoke test now follows the clean school-live flow: teacher registration, classroom invite, student join, student question, wellbeing chat, check-in share, stuck-signal share, and teacher analysis sync.
- Formal privacy/security review is documented in `outputs/teachflow-v0.1/SECURITY_REVIEW.md`.

## Recent Work

2026-07-02:

- Added shared workspace API and JSON persistence.
- Connected student stuck signals to teacher teaching analysis.
- Added account/role/class boundary model.
- Added backend authorization checks and a stricter role/action matrix.
- Installed `agency-agents` as a Codex custom-agent role library and documented the specialist workflow.
- Added login session, role/class boundary enforcement, account switch UI, and session-based workspace API tests.
- Added teacher-visible audit log panel in system settings.
- Added login-page regression checks.
- Added real-browser workflow test for student assignment, stuck signal, and teacher sync.
- Added a formal privacy/security review and updated privacy notes.
- Fixed student-to-teacher XSS risk in the teacher analysis stuck-signal panel.
- Added dedicated school-admin dashboard and connected school-admin login to the third portal.
- Added multi-class demo data and school-admin class comparison metrics.
- Added the long-term AI School Agent architecture document and a school-admin architecture channel.
- Added Student Check-in, shared learning support signals, teacher support profiles, and check-in API boundaries.
- Merged standalone teacher `理解诊断`, `分层干预`, and `学生跟进` channels into a single cleaner `教学分析` workspace with detail modals for evidence, intervention plans, and student support profiles.
- Prepared public cloud-demo deployment config for Render and added one teacher plus one student test identity for two-window testing.
- Added a Teams-style message center and shared message API so student help requests and teacher replies are recorded in the unified workspace.
- Fixed teacher message-center refresh so background sync does not clear an active teacher draft.
- Added a UI cleanup pass: repeated explanatory panels are folded into on-demand detail blocks, and teacher course student details now open in a modal instead of staying visible beside the roster.
- Added the first Teacher Agent Orchestrator total API, connected it to the teacher analysis panel, and added tests proving only teacher sessions can access the briefing.

2026-07-03:

- Created `outputs/teachflow-school-live` as a clean school-trial copy of the active TeachFlow app.
- Removed active default demo data from the school-live default workspace.
- Added teacher registration, classroom creation, invite-link lookup, and student registration through invite links.
- Added school-live session routes: `/api/session/register-teacher`, `/api/session/register-student`, and `/api/session/invite?token=...`.
- Updated the school-live login UI from demo-account selection to teacher registration and student join forms, while retaining existing-account quick entry after accounts exist.
- Updated teacher and student prototypes in school-live to read the logged-in session alias/class instead of fixed `S002`.
- Added dynamic school-live teacher overview/course screens and student home/material screens to avoid old first-screen demo data.
- Added a separate localStorage key and school-live registration test.
- Verified school-live with `npm.cmd run check`.
- Started the school-live app at `http://127.0.0.1:5175/login.html`; the fresh API returned an empty account list and `school-live` state.
- Added the first Student Agent Orchestrator total API.
- Added `GET /api/student-agent/briefing`, `POST /api/student-agent/chat`, `POST /api/student-agent/stuck-draft`, and `POST /api/student-agent/share-to-teacher`.
- Connected the student AI support panel to the Student Agent briefing with local fallback, source-signal chips, and share-preview UI.
- Updated the stuck flow so the student can draft a learning signal first, then explicitly share it to the teacher.
- Preserved original student stuck-note text as evidence while returning a cleaner Agent summary draft.
- Added tests for Student Agent engine behavior, role boundaries, API access, share-to-teacher sync, and compatibility with teacher Agent briefing.
- Added the first Teacher Agent executable action layer.
- Added `POST /api/teacher-agent/actions` for teacher-only action execution.
- Connected teacher analysis action cards to send approved support messages, assign materials, schedule short follow-ups, and mark recommendations handled.
- Connected student home/material/progress views to teacher-approved Agent actions scoped to the current student alias.
- Added store/API tests for teacher action execution, student visibility, persistence, and student access denial.
- Added `outcome-evaluation-engine.js`.
- Connected outcome evaluation into Teacher Agent briefing and the teacher `教学分析` UI.
- Added outcome evaluation tests and included the new engine in `npm.cmd run check`.
- Added unread/read/responded state for teacher-approved actions, plus a browser workflow test that clicks the student feedback button and verifies teacher outcome evaluation reads linked evidence.
- Closed the first teacher-action feedback loop: student-visible teacher actions now include `有帮助，我懂了` / `我还是卡住` responses, the shared workspace stores `linkedTeacherActionId` and `responseType`, and teacher `成效回流` shows a compact action-to-student-signal timeline.
- Made the teacher `成效回流` area easier to see by adding a top-level summary card, a detail modal, direct `#analysis` channel routing, desktop sticky navigation, and cache-busted teacher prototype assets.
- Connected the school-live teacher `制作材料` page to material type selection and `/api/ai/material-generator`; generated drafts are saved into `draftMaterials` and shown in `审批导出`.
- Teacher `制作材料` now supports editable generated drafts: the preview panel can revise title, goal, outline, notes, student task, and approval checklist, then save back to the shared workspace.

追加更新：

- Prepared a clean manual test workspace for `test-teacher` and `test-student-s002`: questions, stuck signals, check-ins, messages, teacher actions, audit events, and material draft/approval records are empty while account/class boundaries remain intact.
- Added a no-dependency OpenAI provider layer, `.env.local` loading, local fallback mode for tests, teacher-side live Agent question calls, and student-side live Agent chat support. The current local key smoke test did not validate successfully, so a fresh secure key should be used before serious live testing.

## Latest Material-Creation Status

- The school-live teacher `制作材料` workflow now intentionally supports only three active material types: `讲义`, `图片`, and `练习`.
- `图片` generation now uses the OpenAI Images API through the backend provider layer and stores generated PNG files under `outputs/teachflow-school-live/generated/materials/`.
- Generated material drafts now preserve type-specific fields: handout sections/key points, image URL/prompt, and exercise questions/answer keys.
- The teacher preview panel can edit and save generated drafts before approval/export.
- Teacher `审批导出` can now publish a draft to students: published materials move into `approvedMaterials`, create student-visible material assignments, and appear on the student `学习材料` page.
- Teacher `制作材料` now includes a publish-target selector, so a teacher can generate and publish a handout/image/exercise for the whole class or a single student alias such as `S001`.
- Teacher `审批导出` now also includes a per-draft publish-target selector, so the final publish step can keep or override the draft target before students see the material.
- A live smoke test produced an accessible PNG at `generated/materials/material-b37b95e4.png`; automated tests still run in local fallback mode.

## Project Operating Model

- For complex work, Codex should use the project brain first, then apply specialist-agent thinking by phase.
- Recommended sequence: `Software Architect`, `Backend Architect`, `Prompt Engineer`, `Frontend Developer`, `UX Architect`, security/privacy review, `Code Reviewer`, then `Technical Writer`.
- See `AGENT_WORKFLOW.md` for exact role names and TeachFlow guardrails.

## Current Commands

Run from `outputs/teachflow-v0.1`:

```powershell
npm.cmd run dev
npm.cmd run check
npm.cmd run test:browser-workflow
node server.js --port=5174
```

Run the clean school-live app from `outputs/teachflow-school-live`:

```powershell
npm.cmd run dev
npm.cmd run check
npm.cmd run test:system
npm.cmd run test:browser-workflow
node server.js --port=5175
```

## Known Issues And Risks

- Real production login/session is not implemented; current login is a local demo session without passwords, MFA, external identity provider, account lifecycle, or production session store.
- School-live registration currently creates local accounts without passwords or external identity verification. It is suitable for MVP testing, not production authentication.
- CSRF protection is not implemented for mutating API routes.
- Current persistence is a local JSON file, not a production database.
- Browser `localStorage` can retain demo workspace state on shared devices.
- Audit log is useful for demos but is not tamper-proof compliance logging.
- Security headers, CSP, rate limiting, and route-level free-text constraints are not production-ready.
- Live AI routes currently have basic role/session boundaries but not production-grade rate limiting, prompt-injection hardening, or schema eval coverage.
- Formal review says the app is acceptable for anonymous local demo, conditionally acceptable for controlled alias-only school trial, and not ready for real student personal data.
- Folder naming is confusing: active folder is `teachflow-v0.1`, package is `v0.3`.
- Git command was not available in the current shell during knowledge-base setup, so recent commit history was not inspected. `.git` exists, but `git` was not callable.
- Temporary SSH tunnel demos can be unreliable; use the local service for development and Render or another Node host for stable public demos.

## Next Recommended Steps

1. Add persistent student learning memory records separate from teacher-visible signals.
2. Add richer school-admin views for teacher workload, pilot feedback, and readiness reporting.
3. Add one non-physics demo scenario to prove TeachFlow is not tied to one subject.
4. Add CSRF protection for all mutating API routes.
5. Clear browser workspace cache on logout/account switch.
6. Add security headers and a basic Content Security Policy.
7. Define local pilot retention and deletion workflow.
8. Define a safeguarding role/escalation workflow before expanding AI 学习关怀 beyond local demo language.
9. Replace JSON persistence with SQLite or another simple local database when the data model stabilizes.
10. Only after the above, consider real AI integration for teacher-drafted materials and student support.
11. Add unread/read states and teacher acknowledgement actions for the message center.
12. Keep future UI additions under the rule: key metrics and primary actions stay visible; secondary records, explanations, and long process details should open on demand.
13. Add a visible test reset control for development/demo operators so clean two-account testing can be restored without editing `data/workspace-state.json`.
14. Rotate any API key pasted into chat and replace the local live-AI key with a fresh secure key before serious testing.
15. Add prompt/schema evals for `/api/ai/teacher-agent` and `/api/ai/student-agent`.

## Current Focus

Build toward a school-trial-ready AI teaching system while preserving teacher control, alias-only privacy, deterministic local behavior, and clear privacy/security boundaries.
