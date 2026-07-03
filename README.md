# TeachFlow

TeachFlow is an AI School Agent System for classroom pilots. It gives teachers a controlled AI assistant for understanding student learning signals, while giving students a private learning assistant for asking questions, submitting work, and sharing learning blockers when they choose to.

The current MVP focuses on one complete learning loop:

```text
Student learning signals -> Student Agent -> shared classroom data -> Teacher Agent
-> teacher-approved intervention/materials -> student response -> outcome feedback
```

## Why It Exists

Teachers often receive student questions, homework evidence, emotional learning blockers, and classroom progress signals in scattered places. TeachFlow turns those signals into a teacher-controlled workflow:

- students can ask for help and submit learning evidence
- the Student Agent helps students clarify what they are stuck on
- the Teacher Agent summarizes class-level patterns and individual support needs
- teachers approve, edit, and publish materials or interventions
- later student feedback flows back into teaching analysis

The goal is not to replace teachers. The goal is to help teachers see what is happening sooner and act with better evidence.

## Core Modules

| Module | What it does |
| --- | --- |
| Student Agent | Helps a student ask questions, reflect on blockers, draft a shareable stuck-signal, and receive learning support. |
| Teacher Agent | Reads class-scoped student signals and produces priorities, misconception clusters, suggested interventions, message drafts, and outcome feedback. |
| Teaching Analytics | Combines misconception diagnosis, differentiated intervention, student follow-up, and outcome return into one teacher workspace. |
| Material Generator | Creates teacher-editable drafts for handouts, images, and practice exercises before publication. |
| Teacher Control Layer | Keeps teachers in charge of approval, editing, target selection, publishing, and audit history. |
| Shared Data Layer | Syncs questions, stuck signals, check-ins, teacher messages, materials, and feedback across teacher/student views. |
| School Admin View | Shows aggregate pilot metrics and class comparison without exposing individual student details. |

## Current App

The active school-trial app lives in:

```text
outputs/teachflow-school-live/
```

It starts from a clean workspace:

1. A teacher registers and creates a class.
2. TeachFlow generates a classroom join link.
3. A student joins through the link and receives an anonymous alias such as `S001`.
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

The system test covers teacher registration, student join, Student Agent briefing, Teacher Agent analysis, wellbeing-chat privacy, stuck-signal sharing, outcome evaluation, and targeted material publishing.

## AI Configuration

TeachFlow can run in deterministic local fallback mode without an API key. For live AI behavior, create a local environment file based on:

```text
outputs/teachflow-school-live/.env.example
```

Do not commit real API keys or private environment files.

## Privacy And Safety Principles

- Use anonymous student aliases such as `S001`, not real student names or school IDs.
- AI drafts; teachers decide.
- Student wellbeing support is for learning pressure reflection, not psychological diagnosis, therapy, medical care, or crisis response.
- Student check-in details are only teacher-visible when the student explicitly shares a learning summary.
- Teacher dashboards should show the minimum necessary learning evidence.
- Generated materials require teacher approval before students see them.

## Project Status

This is an MVP for controlled demos and early school-trial discussion. It is not production-ready for real student personal data yet.

Current limitations:

- local/demo-grade sessions, not production identity management
- JSON-file persistence, not a production database
- no production CSRF/rate-limit/security-header layer yet
- live AI integration is available behind backend routes but still needs prompt/schema evaluations and operational safeguards

## Deployment

The repository includes `render.yaml` and can be deployed as a simple Node service. A stable public deployment should use environment variables for API keys and should avoid uploading real student data.

## Useful Paths

```text
outputs/teachflow-school-live/server.js
outputs/teachflow-school-live/teacher-agent-orchestrator.js
outputs/teachflow-school-live/student-agent-orchestrator.js
outputs/teachflow-school-live/ai-agent-service.js
outputs/teachflow-school-live/workspace-store.js
docs/brain/AI_SCHOOL_AGENT_ARCHITECTURE.md
```
