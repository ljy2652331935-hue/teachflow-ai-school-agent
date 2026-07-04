# Decision: Teacher Agent Actions Require Explicit Teacher Approval

## Date

2026-07-03

## Background

TeachFlow is moving from static teacher Agent recommendations toward a usable school-agent workflow. The Teacher Agent can now identify priority students, draft messages, and suggest materials, but the project principle is that AI drafts and teachers decide.

## Options

1. Let the Teacher Agent automatically send messages/materials when confidence is high.
2. Keep recommendations as read-only text and ask teachers to manually copy actions elsewhere.
3. Add an executable action layer where every action is triggered by a teacher click and then persisted in the shared workspace.

## Final Choice

Use option 3: teacher-approved executable actions.

## Reasons

- Preserves the teacher-control principle.
- Keeps the demo workflow concrete: teacher recommendations can become student-visible messages, materials, and follow-ups.
- Maintains alias-only privacy because actions are class/alias scoped through the existing workspace boundary.
- Creates audit evidence for who approved an action and when.

## Impact

- Added `teacherAgentActions` to the shared workspace state.
- Added `POST /api/teacher-agent/actions`, teacher-only.
- Student views can show only their own visible teacher-approved actions.
- Dismiss/handled actions stay teacher-only and reduce repeated priority pressure.

## Follow-up Checks

- Add unread/read states for teacher-approved actions.
- Add outcome evaluation to compare later student progress with prior teacher actions.
- Revisit CSRF protection before any real pilot.
