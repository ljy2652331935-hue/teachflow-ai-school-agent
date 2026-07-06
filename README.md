# QE Learning

![Status](https://img.shields.io/badge/status-MVP%20demo-blue)
![Stack](https://img.shields.io/badge/stack-Node.js%20%2B%20Browser%20JS-111111)
![AI Mode](https://img.shields.io/badge/AI-live%20or%20deterministic%20fallback-7c3aed)
![Principle](https://img.shields.io/badge/principle-AI%20suggests%2C%20teachers%20decide-16a34a)

**The understanding layer for AI classrooms.**

QE Learning is a teacher-controlled AI School Agent System that helps schools turn student confusion into timely, targeted, and trackable learning support.

Most AI education tools focus on either student tutoring or teacher productivity. QE Learning focuses on the missing workflow between them:

```text
student signal -> AI diagnosis -> teacher-approved support
-> student response -> outcome feedback
```

[Live demo](https://qe-learning-demo.onrender.com/login.html) | [Judge classroom link](https://qe-learning-demo.onrender.com/login.html?join=join-demo) | [Active app](outputs/teachflow-school-live) | [Project brain](docs/brain)

## Why This Exists

If a school is like an organization, one of its hardest workflows is not assigning content. It is helping every student truly understand.

Teachers receive student questions, homework evidence, learning pressure, and classroom progress signals in scattered places. QE Learning turns those signals into one controlled teaching loop:

- students ask questions, submit work, and share stuck points through a personal learning agent
- the Student Agent helps students clarify what they do not understand
- the Teacher Agent summarizes class patterns, misconceptions, and follow-up priorities
- teachers review, edit, approve, and publish support materials
- student feedback flows back into Teaching Analytics so teachers can see whether support worked

The goal is not to replace teachers. The goal is to help teachers see misunderstanding earlier and act with better evidence.

## What It Does

| Area | What it does |
| --- | --- |
| Student Agent | Helps a student ask learning questions, clarify stuck points, submit evidence, and draft teacher-shareable summaries. |
| Teacher Agent | Reads class-scoped learning signals and produces priorities, misconception clusters, intervention ideas, message drafts, and outcome feedback. |
| Teaching Analytics | Combines misconception diagnosis, differentiated intervention, student follow-up, and support effectiveness in one teacher workspace. |
| Material Generator | Creates teacher-editable handouts, visuals, and practice exercises before publication. |
| Teacher Control Layer | Keeps teachers in charge of editing, approval, target selection, publishing, and audit history. |
| Shared Data Layer | Syncs questions, stuck signals, check-ins, messages, materials, and feedback across teacher and student views. |
| School Admin View | Shows aggregate pilot metrics and class comparison without exposing individual student details. |

## The Core Loop

```text
Student
  asks a question / submits work / shares a stuck point
      |
      v
Student Agent
  clarifies the signal and protects student choice
      |
      v
Shared Classroom Data Layer
  stores class-scoped learning evidence
      |
      v
Teacher Agent
  diagnoses patterns, suggests actions, and prepares drafts
      |
      v
Teacher Control Layer
  teacher reviews, edits, approves, and publishes
      |
      v
Student receives targeted support
      |
      v
Outcome Feedback
  teacher sees whether the support helped or needs follow-up
```

## How To Try The Demo

Use the public deployment:

```text
https://qe-learning-demo.onrender.com/login.html
```

For a student join flow, use:

```text
https://qe-learning-demo.onrender.com/login.html?join=join-demo
```

Suggested demo path:

1. Open the teacher side and create or enter a class.
2. Open the classroom join link in another browser window as a student.
3. Ask a learning question or share a stuck point as the student.
4. Return to the teacher side and open Teaching Analytics.
5. Generate a handout, visual, or practice task.
6. Approve and publish it to the whole class or a single student.
7. Let the student respond, then check outcome feedback on the teacher side.

Render free deployments may sleep when inactive, so the first request can take a short time to wake up.

## Run Locally

The active school-trial app lives in:

```text
outputs/teachflow-school-live/
```

Start it:

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

The system checks cover teacher registration, classroom invite links, student join, Student Agent briefing, Teacher Agent analysis, wellbeing-chat privacy, stuck-signal sharing, outcome evaluation, and targeted material publishing.

## AI Configuration

QE Learning can run in deterministic local fallback mode without an API key. For live AI behavior, create a local environment file based on:

```text
outputs/teachflow-school-live/.env.example
```

Do not commit real API keys, private environment files, real student data, or production secrets.

## Privacy And Safety Principles

- Use anonymous student aliases such as `S001`, not real names or school IDs.
- AI drafts; teachers decide.
- Students choose when to share a stuck-point summary with the teacher.
- Wellbeing support is for learning pressure reflection, not diagnosis, therapy, medical care, or crisis response.
- Teacher dashboards should show the minimum necessary learning evidence.
- Generated materials require teacher approval before students see them.

## Project Status

This is an MVP for demos and early school-trial discussion. It is not production-ready for real student personal data yet.

Current limitations:

- demo-grade sessions, not production identity management
- JSON-file persistence, not a production database
- no production CSRF, rate-limit, or security-header layer yet
- live AI routes exist, but prompt/schema evaluations and operational safeguards still need more work
- privacy review is suitable for anonymous controlled demos, not full production deployment

## Repository Map

```text
outputs/teachflow-school-live/
  server.js                         # Node server and API routes
  teacher-prototype.*               # Teacher app
  student-prototype.*               # Student app
  school-admin-prototype.*          # School admin app
  teacher-agent-orchestrator.js     # Teacher Agent total API logic
  student-agent-orchestrator.js     # Student Agent total API logic
  ai-agent-service.js               # Live AI service wrapper
  workspace-store.js                # Shared classroom data layer
  tests/                            # System and workflow checks

docs/brain/
  AI_SCHOOL_AGENT_ARCHITECTURE.md   # Agent architecture notes
  CURRENT_STATE.md                  # Current progress and risks
  devlog/                           # Development history
```

## What Makes It Different

QE Learning is not just another chatbot and not just another worksheet generator.

It is built around a closed instructional loop:

- collect learning signals from students
- diagnose where understanding breaks down
- keep teachers in control of all support
- publish targeted materials or messages
- track whether the intervention actually helped

In one line:

> QE Learning helps teachers know who is stuck, why they are stuck, what to do next, and whether the support worked.
