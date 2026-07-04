# Decision: Student Agent Orchestrator Boundary

## Date

2026-07-03

## Background

TeachFlow needs a student-side Agent that helps learners understand teacher-approved material, turn vague confusion into clear learning signals, and decide when to share a summary with the teacher. The risk is that a student-facing agent could become an unbounded chatbot, homework-completion tool, or privacy leak.

## Options

- Use a generic GPT-style student chatbot.
- Keep only the existing stuck-signal form without an Agent layer.
- Add a Student Agent Orchestrator with controlled APIs and explicit share-to-teacher consent.

## Final Choice

Add `student-agent-orchestrator.js` and protected `/api/student-agent/*` routes.

The Student Agent can generate a personal briefing, answer controlled learning questions, draft a clearer stuck signal, and share that signal to the teacher only when the student explicitly confirms.

## Reasons

- Keeps student support focused on learning, not homework replacement.
- Preserves privacy by default: ordinary Agent answers stay student-side.
- Creates a clean bridge into the Teacher Agent through explicit learning signals.
- Keeps all role and alias boundaries server-side through the existing session context.
- Lets the MVP stay deterministic and demo-stable before any real AI integration.

## Impact

- `GET /api/student-agent/briefing` returns the current student's personal learning brief.
- `POST /api/student-agent/chat` returns controlled learning guidance without writing full chat to teacher-visible records.
- `POST /api/student-agent/stuck-draft` turns vague confusion into a shareable summary.
- `POST /api/student-agent/share-to-teacher` writes the student-confirmed stuck signal into the unified workspace.
- Teacher-side evidence preserves the original student note; the cleaned Agent summary remains available as a draft.

## Follow-up Checkpoints

- Add persistent student-private learning memory separate from teacher-visible records.
- Add outcome evaluation linking Student Agent advice to later submissions and teacher feedback.
- Add clearer UI affordances for "private to me" versus "shared with teacher".
- Review safeguarding and retention rules before any real school trial with non-demo data.
