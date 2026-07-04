# Decision: Teacher Agent Orchestrator API

## Date

2026-07-02

## Background

TeachFlow is evolving from separate teacher tools into an AI School Agent System. The teacher side needs one assistant-like layer that can read the unified data layer, combine student submissions, stuck signals, questions, Check-ins, messages, class context, and safety rules, then return a concise teacher briefing.

## Options

- Let each feature API call related APIs directly.
- Let the frontend call many small AI APIs and combine results in the browser.
- Add one Teacher Agent Orchestrator API that reads shared data and coordinates deterministic internal tools.

## Final Choice

Add a protected `GET /api/teacher-agent/briefing` total API backed by `teacher-agent-orchestrator.js`.

## Reasons

- Keeps the frontend simple: the teacher page asks for one briefing.
- Keeps data sharing controlled through the unified workspace layer.
- Preserves teacher control: generated messages and materials are drafts.
- Preserves privacy: the route is teacher-only and class-scoped through the server session.
- Creates a stable place to later connect real AI or sub-tools without rewriting the UI.

## Impact

- `teacher-agent-orchestrator.js` now produces priorities, misconception clusters, intervention suggestions, message drafts, source signals, and safety notes.
- `workspace-store.js` enforces `read_teacher_agent` access for teachers only.
- `server.js` exposes `GET /api/teacher-agent/briefing`.
- `teacher-prototype.js` uses the briefing in the Teaching Analysis Agent panel, with local fallback when the API is unavailable.

## Follow-up Checkpoints

- Add teacher action buttons for approving message drafts, creating materials, scheduling short check-ins, and dismissing recommendations.
- Add an outcome-evaluation pass that compares later student signals against prior interventions.
- Keep real AI integration behind the same orchestrator boundary after the privacy/security production gates are handled.
