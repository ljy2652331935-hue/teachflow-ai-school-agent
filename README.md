# TeachFlow

TeachFlow is an AI School Agent System designed for school pilot use. It combines a teacher-side agent, a student-side agent, shared classroom data, and teacher-controlled material generation.

## What It Does

- Student side: ask learning questions, submit assignments, record learning blockers, complete learning-state check-ins, receive learning support, and use a private wellbeing-support coach for learning pressure.
- Teacher side: view classroom teaching analytics, misconception diagnosis, student status, outcome feedback, messages, and AI-assisted material drafts.
- Material creation: generate handouts, images, and practice exercises, then require teacher review before publishing to the whole class or to individual student aliases.
- Data loop: student signals flow into teacher analysis; teacher-approved actions flow back to students; later student responses feed outcome evaluation.

## Current Active App

The school-trial MVP lives in:

```text
outputs/teachflow-school-live/
```

It starts from an empty school workspace:

1. Teacher registers and creates a class.
2. TeachFlow generates a classroom join link.
3. Student joins through the link and receives an anonymous alias such as `S001`.
4. Student questions, assignments, check-ins, stuck signals, messages, and feedback sync into the teacher analysis workspace.

## Run Locally

```powershell
cd outputs/teachflow-school-live
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5174/login.html
```

If the port is busy:

```powershell
node server.js --port=5175
```

## Test

```powershell
cd outputs/teachflow-school-live
npm.cmd run check
npm.cmd run test:system
npm.cmd run test:browser-workflow
```

The system test covers teacher registration, student join, Student Agent briefing, Teacher Agent analysis, wellbeing chat privacy, stuck-signal sharing, outcome evaluation, and targeted material publishing.

## AI Configuration

TeachFlow can run in deterministic local fallback mode without an API key. For live AI behavior, create a local environment file based on:

```text
outputs/teachflow-school-live/.env.example
```

Do not commit real API keys or private environment files.

## Privacy And Safety Principles

- Use anonymous student aliases such as `S001`, not real names or school IDs.
- AI drafts; teachers decide.
- Private wellbeing chat is not a psychological diagnosis, therapy, doctor, or crisis service.
- Student check-in details are only teacher-visible when the student explicitly shares a learning summary.
- Generated materials require teacher approval before publishing.

## Deployment

The project includes `render.yaml` and can be deployed as a simple Node service. The MVP currently uses JSON-file persistence and demo-grade sessions, so it is suitable for controlled pilots and demos, not production student personal data.
