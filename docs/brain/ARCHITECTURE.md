# Architecture

## Active App

```text
outputs/teachflow-v0.1/
```

The active app is a plain Node.js + browser JavaScript application. It has no external dependencies in `package.json`.

For the long-term AI school agent system map, see `AI_SCHOOL_AGENT_ARCHITECTURE.md`.

## Runtime

- `server.js` serves static files and exposes session/workspace API routes.
- Browser entry points:
  - `index.html`: redirects/links into the login screen.
  - `login.html`: demo identity selection for teacher, student, or school-admin.
  - `teacher-prototype.html`: teacher-side prototype.
  - `student-prototype.html`: student-side prototype.
  - `school-admin-prototype.html`: school-level prototype for aggregate pilot operations.
  - `app.js`: older/full workflow UI for v0.3 engine workflow.
- Static assets and CSS are colocated in the app folder.

## Major Modules

- `diagnosis-engine.js`: parses student responses and produces misconception analysis.
- `intervention-engine.js`: generates differentiated teaching intervention materials.
- `control-layer.js`: handles section approvals, version history, audit entries, exports, and rollback helpers.
- `memory-engine.js`: builds teacher-only anonymised student learning memory and micro-quiz follow-up updates.
- `student-portal-engine.js`: creates controlled student assignments, reflections, and micro-quiz attempts.
- `understanding-map-engine.js`: creates alias-level understanding maps, stuck signals, and alternate explanations.
- `school-agent-engine.js`: evaluates readiness, priorities, guardrails, and morning brief.
- `dual-agent-engine.js`: deterministic teacher/student agent states and answers for prototype pages.
- `teacher-agent-orchestrator.js`: deterministic Teacher Agent total API engine that reads unified workspace evidence and returns a teacher briefing, priorities, misconception clusters, intervention suggestions, message drafts, source signals, and safety notes.
- `outcome-evaluation-engine.js`: deterministic learning outcome evaluator that compares teacher-approved actions with later student signals and classifies improved / needs-follow-up / monitoring / waiting states.
- `student-agent-orchestrator.js`: deterministic Student Agent total API engine that reads one student's scoped workspace and returns a personal briefing, controlled learning answer, stuck-signal draft, next steps, source signals, and privacy notes.
- `workspace-state.js`: shared browser/Node workspace model, local cache, API sync client, demo accounts, roles, and class scoping.
- `workspace-store.js`: file-backed workspace persistence, teacher/student Agent actions, and authorization checks.
- `session-store.js`: local demo sessions, safe account listing, and HttpOnly session cookie helpers.
- `auth-ui.js`: browser login, account switching, and role-page guard UI.
- `teacher-prototype.js`: teacher workspace UI, including unified teaching analysis, modal detail views for diagnosis/intervention/student support, production/approval flows, role boundaries, and audit log display.
- `student-prototype.js`: student workspace UI, including assignment submission, question flow, AI learning support, Student Check-in / AI 学习关怀助手, and stuck-signal sync.
- `school-admin-prototype.js`: school-admin UI, including aggregate metrics, multi-class comparison, class summaries, school-agent recommendations, system architecture, roadmap, and audit summaries.
- `server.js`: static server plus `/api/workspace` API.

## Data Flow

Teacher workflow:

```text
anonymised responses
  -> diagnosis-engine
  -> intervention-engine
  -> control-layer approval/export
  -> memory-engine
  -> student portal / understanding map / teacher analysis
```

Prototype workspace flow:

```text
student-prototype.js
  -> window.TeachFlowWorkspaceState
  -> /api/workspace
  -> workspace-store.js
  -> data/workspace-state.json
  -> teacher-prototype.js teaching analysis
```

Student Check-in flow:

```text
student-prototype.js learning check-in
  -> workspace-state.js recordCheckIn()
  -> /api/workspace/check-ins
  -> workspace-store.js authorization and audit
  -> scopedStateForContext()
  -> student sees full own check-in
  -> teacher sees only teacher-visible learning summary
  -> school-admin sees aggregate counts only
```

Teacher Agent Orchestrator flow:

```text
teacher session
  -> GET /api/teacher-agent/briefing
  -> workspace-store authorization: teacher only
  -> workspace-state scopedStateForContext()
  -> teacher-agent-orchestrator.js
  -> teacher priorities, misconception clusters, interventions, message drafts, source signals, safety notes
  -> teacher-prototype.js teaching analysis panel
```

Teacher Agent action flow:

```text
teacher reviews Teacher Agent recommendation
  -> POST /api/teacher-agent/actions
  -> workspace-store authorization: teacher only, current class only
  -> workspace-state recordTeacherAgentAction()
  -> teacherAgentActions persisted in data/workspace-state.json
  -> send_message also creates a teacher message in the student thread
  -> student scoped workspace shows only own visible actions/materials/follow-ups
```

Learning outcome evaluation flow:

```text
teacherAgentActions
  + later student messages/questions/stuck signals/check-ins/assignment audit
  -> outcome-evaluation-engine.js
  -> outcomeEvaluation summary and per-alias status
  -> teacher-agent-orchestrator.js includes result in briefing
  -> teacher-prototype.js shows learning outcome feedback in 教学分析
```

Student Agent Orchestrator flow:

```text
student session
  -> GET /api/student-agent/briefing
  -> workspace-store authorization: student only
  -> workspace-state scopedStateForContext()
  -> student-agent-orchestrator.js
  -> personal briefing, next steps, stuck draft, learning answer, privacy notes
  -> student-prototype.js AI learning support panel
```

Student Agent share-to-teacher flow:

```text
student writes vague stuck note
  -> POST /api/student-agent/stuck-draft
  -> student reviews cleaned learning signal
  -> POST /api/student-agent/share-to-teacher
  -> workspace-state recordStuckSignal()
  -> teacher message center and Teacher Agent briefing can read the signal
```

Access boundary flow:

```text
login.html / auth-ui.js account selection
  -> /api/session/login
  -> session-store creates HttpOnly cookie
  -> /api/workspace
  -> server.js reads session context
  -> workspace-store authorization
  -> workspace-state scopedStateForContext()
  -> role-scoped response
```

School-admin aggregate flow:

```text
school-admin-prototype.js
  -> /api/workspace
  -> workspace-state scopedStateForContext()
  -> schoolAggregate metrics and comparison signals
  -> dashboard without individual student rows
```

Authorization enforcement:

```text
session context
  -> workspace-store authorizeContext()
  -> role/action matrix
  -> class and student-alias checks
  -> audit authorization failures
```

Audit visibility flow:

```text
session/workspace action
  -> workspace-store.js appends auditEvents
  -> scopedStateForContext()
  -> teacher-prototype.js settings channel
  -> class-scoped audit log panel
```

## Persistence

- Current MVP persistence is JSON-file backed.
- Default persisted file: `outputs/teachflow-v0.1/data/workspace-state.json`.
- Tests can override this with `TEACHFLOW_WORKSPACE_FILE`.
- Browser also keeps a local cache under `localStorage` key `teachflow.workspace.v1`.
- Audit events are stored in workspace state under `auditEvents`.

## Security And Privacy Boundaries

- The browser is untrusted; all role/class/student identity comes from the server session.
- Students can update only their own assignment, question, and stuck-signal records.
- Teachers can read/update the class workspace but cannot impersonate student question or stuck-signal routes.
- School-admin receives aggregate-only workspace data through `schoolAggregate` and cannot mutate workspace state.
- `schoolAggregate` includes class counts, alias counts, submitted/support rates, activity scores, attention scores, dominant needs, and comparison highlights.
- Student-supplied text rendered in teacher analysis must be escaped before entering `innerHTML`.
- Student Check-in private reflection and raw note fields must not be returned to teacher-scoped workspace responses unless the student explicitly chose a teacher-visible learning summary; teacher responses still omit private reflection.
- AI 学习关怀 is learning support only. It must not diagnose mental-health conditions, replace a counsellor, or let ordinary teacher views read full private student conversations.
- The current security review is in `../../outputs/teachflow-v0.1/SECURITY_REVIEW.md`.

## API Routes

Session routes:

- `GET /api/session`
- `GET /api/session/accounts`
- `POST /api/session/login`
- `POST /api/session/logout`

Workspace base route: `/api/workspace`

- `GET /api/workspace`
- `PUT /api/workspace`
- `POST /api/workspace/reset`
- `POST /api/workspace/assignment`
- `POST /api/workspace/questions`
- `POST /api/workspace/stuck-signals`
- `POST /api/workspace/check-ins`
- `POST /api/workspace/messages`

Teacher Agent route:

- `GET /api/teacher-agent/briefing`
- `POST /api/teacher-agent/actions`

Student Agent routes:

- `GET /api/student-agent/briefing`
- `POST /api/student-agent/chat`
- `POST /api/student-agent/stuck-draft`
- `POST /api/student-agent/share-to-teacher`

Workspace routes require a valid local demo session. Query/body context must not override the server-side session context.
The Teacher Agent route also requires a valid teacher session and is not available to student or school-admin sessions.
Student Agent routes require a valid student session and use the server-side student alias. Teacher and school-admin sessions cannot access student-agent routes in this MVP.
Teacher Agent action execution is teacher-only. Students can see only their own `studentVisible` action records after the teacher approves them.

## Tests

`npm.cmd run check` runs syntax checks, regression tests, workspace store/API tests, and JSON schema parsing.

Important test files:

- `tests/workspace-store.test.js`
- `tests/workspace-api.test.js`
- `tests/login-page.test.js`
- `tests/browser-login-smoke.test.js`
- engine tests under `tests/*.test.js`

Browser workflow smoke checks verify:

- `login.html` opens and lists three demo identities.
- Teacher session reaches `teacher-prototype.html`.
- Teacher settings shows the `安全审计` panel with login/logout audit rows.
- Teacher session is blocked from student-only page access.
- Student session reaches `student-prototype.html`.
- Student submits an assignment through the real assignment page.
- Student sends a stuck signal through the AI learning support page.
- Student session is blocked from teacher-only page access.
- Teacher logs back in, opens teaching analysis, and sees the latest stuck-signal note plus assignment/stuck audit events.
- Browser workflow also submits malicious-looking stuck-signal text and verifies it is displayed as text, not executed as page code.
- Teacher session is blocked from `school-admin-prototype.html`, then school-admin login reaches the aggregate dashboard and sees three-class comparison signals.

## Known Architecture Caveats

- Production authentication/session handling is not implemented; the current session layer is local-demo only and in-memory.
- The audit log is MVP-level and local-demo scoped; it is not a tamper-proof compliance log.
- `outputs/teachflow-v0.1` folder name does not match the package version `v0.3`.
- Some historical terminal output may show Chinese text as mojibake due to shell encoding; verify in browser/files before assuming source content is intentionally garbled.
- Local server process management on Windows/Codex desktop may require care because old Node processes can keep port `5174`.
