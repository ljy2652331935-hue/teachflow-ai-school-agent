# TeachFlow v0.3

Core teacher workflow plus a unified Teaching Analysis workspace, Student Portal Lite, Student Understanding Map, Student Check-in, School Admin Dashboard, AI School Agent architecture view, and School Agent Console.

TeachFlow helps a teacher paste anonymised student responses, generate a structured misconception map with evidence, turn that map into a differentiated intervention plan, review and approve the AI-generated draft, export a Markdown package, update anonymised learning-state memory, publish teacher-approved materials to student aliases, map each alias's current understanding, and surface system-level next actions through an AI school system agent console.

Student Check-in adds an AI 瀛︿範鍏虫€€鍔╂墜 for learning frustration and support signals. It is not an AI therapist, does not diagnose mental-health conditions, and does not show full private student conversations to teachers by default.

The local MVP now starts from a demo login session. Teacher, student, and school-admin accounts are bound to a class-scoped session cookie before the workspace API returns data.

## What This Version Does

1. Teacher creates a course and topic.
2. Teacher enters learning objectives.
3. Teacher enters lesson material.
4. Teacher pastes anonymised student responses.
5. Teacher clicks `Analyse Understanding`.
6. TeachFlow generates a misconception map.
7. Every misconception includes exact evidence quotes from student responses.
8. Teacher opens `Intervention Studio`.
9. TeachFlow generates a revised teaching plan, Level 1/2/3 materials, a visual aid prompt, a video storyboard, a micro quiz, and teacher notes.
10. Every intervention section links back to diagnosed misconception IDs.
11. Teacher opens `Review & Approval Studio`.
12. Teacher can edit each section separately.
13. Each edit creates a new version.
14. Teacher can approve individual sections or the full intervention.
15. Teacher can reject, export, publish to students, or roll back to a previous version.
16. Structured audit log records major actions with actor, action, timestamp, target, and details.
17. Export opens a Markdown preview with copy and download actions.
18. Approved exports update teacher-only Student Memory using anonymised aliases.
19. Teacher can paste micro-quiz follow-up answers to update memory again.
20. Teacher can publish approved differentiated materials to Student Portal Lite.
21. Students select an alias and only see the teacher-approved material assigned to that learning state.
22. Students can answer the micro quiz and submit a short reflection.
23. Teacher can review the selected alias's latest submissions without exposing other students' responses.
24. Students can open a personal Understanding Map for the selected alias.
25. Students can submit an "I am stuck because..." signal without using an open chatbot.
26. Students can open Student Check-in, choose a learning state, write one short note, keep it private, ask AI first, or share a learning summary with the teacher.
27. Teachers see only teacher-visible learning summaries in Teacher Inbox and Student Support Profile, not private reflection text.
28. Teacher uses one `鏁欏鍒嗘瀽` workspace for misconception diagnosis, differentiated intervention, and student follow-up; detailed evidence, intervention plans, and student support profiles open in modal dialogs.
29. Teacher can see class-level understanding-map summaries and assign the next action.
30. School Agent Console reads the current system state and recommends next steps, guardrails, and a morning brief.
31. Teacher Agent Orchestrator reads the unified workspace evidence and returns a teacher briefing with priorities, misconception clusters, intervention suggestions, message drafts, source signals, and safety notes.
32. Teachers can approve Teacher Agent actions to send a support message, assign learning material, schedule a short follow-up, or mark a recommendation handled.
33. Teacher-approved Agent actions are persisted in the shared workspace and scoped back to the relevant student alias.
34. Learning Outcome Evaluation compares teacher-approved actions with later or explicitly linked student signals, tracks student read/response state, and summarizes improved / needs-follow-up / monitoring / waiting states.
35. Student Agent Orchestrator reads only the current student's scoped workspace and returns a personal briefing, controlled learning answer, stuck-signal draft, next steps, source signals, and privacy notes.
36. Students can ask the Student Agent for explanations, ask it to draft a clearer stuck signal, explicitly share that learning signal to the teacher, and respond to teacher-approved actions with "I understand" or "I am still stuck" feedback; teacher actions show unread/read/responded state.
37. Demo login creates a local HttpOnly session for teacher, student, or school-admin roles.
38. Workspace API requests require a session and enforce class/alias boundaries on the server.
39. Audit events record login, logout, student submissions, check-ins, workspace resets, teacher Agent actions, and authorization failures.
40. School-admin users open a dedicated school dashboard with aggregate pilot metrics, multi-class comparisons, class summaries, school-agent recommendations, system architecture, roadmap, and audit summaries.
41. The default demo dataset includes three active class spaces: `楂樹簩鐗╃悊 A 鐝璥, `楂樹竴鐗╃悊 B 鐝璥, and `AP Physics`.
42. Live LLM-backed Agent routes are available behind the backend: `/api/ai/status`, `/api/ai/teacher-agent`, `/api/ai/student-agent`, `/api/ai/material-generator`, and `/api/ai/message-draft`. When OpenAI is unavailable, the app falls back to deterministic local Agent behavior.

## What This Version Does Not Do Yet

- Parent portal
- LMS integration
- Real image or video generation
- Automatic grading
- Unbounded real-AI student-facing chatbot
- AI therapist, mental-health diagnosis, or replacement for school counsellor/safeguarding staff

## Run

```bash
npm install
npm run dev
```

On Windows PowerShell:

```bash
npm.cmd install
npm.cmd run dev
```

Or run:

```bash
start-demo.bat
```

## Live AI Mode

Live AI is optional. The backend reads `OPENAI_API_KEY` from `.env.local`, `.env`, or the process environment. Do not put keys in frontend code or committed files.

Suggested local env file:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.5
OPENAI_FALLBACK_MODEL=gpt-4.1-mini
```

Automated tests force local mode with `TEACHFLOW_AI_MODE=local` so tests do not call the model API or spend credits. Teacher and student pages keep working in local fallback mode if the key is missing, invalid, rate-limited, or offline.

Live routes:

- `GET /api/ai/status`
- `POST /api/ai/teacher-agent`
- `POST /api/ai/student-agent`
- `POST /api/ai/material-generator`
- `POST /api/ai/message-draft`

Then open:

```text
http://localhost:5174
```

## Cloud Demo Deployment

This app can run as a public Node web service. A root-level `render.yaml` is included for Render Blueprint deployment.

Public demo test identities:

- Teacher: `test-teacher` / `娴嬭瘯鑰佸笀`
- Student: `test-student-s002` / `娴嬭瘯瀛︾敓 S002`

Both are scoped to the same demo class and alias `S002`, so you can open the deployed URL in two browser windows and test student-to-teacher sync. See `DEPLOYMENT.md` for the exact deployment notes and current demo limits.

## Check

```bash
npm.cmd run check
```

This validates JavaScript syntax, diagnosis, intervention, control-layer, memory, student-portal, understanding-map, school-agent tests, and JSON files.

## Browser Workflow Smoke Test

```bash
npm.cmd run test:browser-workflow
```

The older login-focused alias also works:

```bash
npm.cmd run test:browser-login
```

This launches a temporary local server and a headless Chrome/Edge browser, then verifies the real teacher/student workflow:

1. `login.html` renders the three demo identities.
2. Teacher login reaches `teacher-prototype.html`.
3. Teacher settings shows the audit panel and login audit event.
4. Teacher session is blocked from the student page by the role gate.
5. Student login reaches `student-prototype.html`.
6. Student sees a teacher-approved action, automatically marks it read, clicks an explicit feedback button, and the teacher outcome engine reads it as linked evidence.
7. Student submits an assignment through the assignment page.
8. Student sends a stuck signal through AI learning support.
9. Student submits a Student Check-in and shares only a learning summary with the teacher.
10. Student session is blocked from the teacher page by the role gate.
11. Teacher logs back in and opens `鏁欏鍒嗘瀽`.
12. Teacher analysis sees the student's assignment audit and latest stuck-signal note.
13. Teacher opens a Teaching Analysis detail modal and sees the shared check-in summary but not private reflection.
14. Student-supplied stuck-signal text is rendered as text and does not execute as page code.
15. Teacher session is blocked from the school-admin dashboard by the role gate.
16. School-admin login reaches `school-admin-prototype.html` and sees aggregate dashboard metrics plus three-class comparison signals without individual student rows.

Set `TEACHFLOW_BROWSER_PATH` if Chrome or Edge is installed in a non-standard location.

## Key Files

- `diagnosis-engine.js`: deterministic first-pass diagnosis engine.
- `intervention-engine.js`: deterministic differentiated intervention generator.
- `control-layer.js`: statuses, section approvals, versions, exports, audit entries, and rollback helpers.
- `memory-engine.js`: teacher-only anonymised student understanding memory and micro-quiz follow-up analysis.
- `student-portal-engine.js`: controlled alias assignments, reflections, and micro-quiz attempts.
- `understanding-map-engine.js`: alias-level understanding-map nodes, stuck signals, and alternate explanations.
- `school-agent-engine.js`: school-system agent readiness, priorities, guardrails, and morning brief.
- `teacher-agent-orchestrator.js`: teacher-side total API engine for briefing, priorities, misconception clusters, intervention suggestions, message drafts, action history, outcome evaluation, source signals, and safety notes.
- `outcome-evaluation-engine.js`: deterministic learning outcome evaluator for teacher-approved actions, explicit student feedback, read/responded state, and later student signals.
- `student-agent-orchestrator.js`: student-side total API engine for personal briefing, controlled learning answers, stuck-signal drafts, next steps, source signals, and privacy notes.
- `workspace-state.js`: shared workspace model, teacher Agent action records, demo accounts, role/class scoping, and browser/API sync.
- `workspace-store.js`: local JSON persistence, teacher Agent action execution, authorization checks, and audit event updates.
- `session-store.js`: local demo sessions, safe account listing, and session cookies.
- `auth-ui.js`: login, account switching, and role-page guard UI.
- `login.html`: first screen for choosing a teacher/student/admin demo identity.
- `teacher-prototype.js`: teacher prototype with a unified teaching analysis workspace, modal details for diagnosis/intervention/student follow-up, material creation, approval/export, role boundaries, and audit panel.
- `student-prototype.js`: student prototype with assignment submission, questions, AI support, Student Check-in, and stuck-signal sync.
- `school-admin-prototype.js`: school-admin dashboard with aggregate metrics, multi-class comparison, AI School Agent architecture, pilot roadmap, school-agent recommendations, and audit summary.
- `PRIVACY_NOTES.md`: MVP privacy/security guarantees, limitations, and hardening steps.
- `SECURITY_REVIEW.md`: formal privacy/security review, risk register, and production gate.
- `app.js`: teacher workflow UI, Student Portal Lite, Understanding Map, and School Agent Console.
- `schemas/model.schema.json`: misconception output JSON schema.
- `schemas/intervention.schema.json`: intervention output JSON schema.
- `schemas/control-layer.schema.json`: teacher control layer JSON schema.
- `schemas/memory.schema.json`: student memory JSON schema.
- `schemas/student-portal.schema.json`: student portal assignment and submission JSON schema.
- `schemas/understanding-map.schema.json`: student understanding map JSON schema.
- `schemas/check-in.schema.json`: Student Check-in, learning support signal, privacy level, and safeguarding flag JSON schema.
- `schemas/types.d.ts`: TypeScript data model.
- `tests/diagnosis-engine.test.js`: engine regression test with Fourier Transform demo data.
- `tests/intervention-engine.test.js`: intervention regression test with Fourier Transform demo data.
- `tests/control-layer.test.js`: versioning, audit, export, and rollback regression test.
- `tests/memory-engine.test.js`: anonymised memory and micro-quiz follow-up regression test.
- `tests/student-portal-engine.test.js`: controlled assignment and submission regression test.
- `tests/understanding-map-engine.test.js`: understanding-map and stuck-signal regression test.
- `tests/school-agent-engine.test.js`: school agent readiness and brief regression test.
- `tests/workspace-api.test.js`: session-scoped workspace API and audit regression test.
- `tests/login-page.test.js`: login page and role guard structure test.
- `tests/browser-login-smoke.test.js`: real-browser login, role gate, assignment submission, stuck-signal, audit visibility, and teacher analysis sync smoke test.

## Privacy Mode

Use aliases only, such as `S001`, `S002`, `S003`. Do not enter real names, emails, phone numbers, school IDs, or sensitive personal data.

For current privacy and security limits, see `PRIVACY_NOTES.md` and `SECURITY_REVIEW.md`.

