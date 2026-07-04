# TeachFlow school Live

This folder is the clean school-trial version of TeachFlow. It is copied from the earlier demo app, but the default workspace starts empty: no demo class, no demo students, no demo questions, and no prefilled classroom records.

The intended first flow is:

1. A teacher opens `login.html`.
2. The teacher registers a teacher account and creates a class.
3. TeachFlow generates a classroom join link.
4. The teacher sends that link to students.
5. A student opens the link, registers a student account, and receives an anonymous alias such as `S001`.
6. Student submissions, questions, stuck signals, messages, and feedback sync back to the teacher's teaching analysis workspace.

## Key Difference From The Demo App

- Active folder: `outputs/teachflow-school-live`
- Package name: `teachflow-school-live`
- Local storage key: `teachflow.school-live.workspace.v1`
- Default persisted data: empty school workspace
- Login mode: teacher/student self-registration
- Student join mode: classroom invite link

The original demo app remains in `outputs/teachflow-v0.1`.

## Run

From this folder:

```powershell
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5174/login.html
```

If that port is busy:

```powershell
node server.js --port=5175
```

## Test

```powershell
npm.cmd run check
```

The check command verifies syntax plus the clean school-live flow:

- no accounts in a fresh workspace
- teacher registration creates a class
- invite link lookup works
- student registration through invite creates alias `S001`
- teacher can see the joined student
- student can only see their own scoped workspace
- student cannot call teacher-agent APIs
- no old demo class/student IDs are written into the persisted workspace

## Important Routes

- `GET /api/session/accounts`
- `GET /api/session/invite?token=...`
- `POST /api/session/register-teacher`
- `POST /api/session/register-student`
- `POST /api/session/login`
- `POST /api/session/logout`
- `GET /api/workspace`
- `POST /api/workspace/questions`
- `POST /api/workspace/stuck-signals`
- `GET /api/teacher-agent/briefing`
- `GET /api/student-agent/briefing`

## Privacy Rule

Use classroom display names or aliases only. Do not enter real student names, emails, school IDs, passwords, API keys, or other sensitive data.

This version is still an MVP. It has a local session cookie and JSON-file persistence, not production identity management or a production database.
