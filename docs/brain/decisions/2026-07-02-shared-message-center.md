# Shared Message Center

## Decision Title

Keep teacher/student messaging in the shared TeachFlow workspace for the MVP.

## Date

2026-07-02

## Background

TeachFlow needs a Microsoft Teams-style interaction layer: students can ask for help, teachers can see activity reminders, and both sides can keep a learning-related conversation record. The current app is still a deterministic local MVP with JSON persistence and role-scoped workspace APIs.

## Options

- Build a separate real-time chat service with sockets or a third-party messaging provider.
- Store learning-related messages inside the existing shared workspace API.
- Keep messages only in browser local state.

## Final Choice

Store teacher/student messages inside the existing shared workspace API and persist them with the demo workspace state.

## Reasons

- The MVP already has role, class, alias, audit, and privacy boundaries in `workspace-store.js`.
- Help requests are learning signals, so they belong near stuck signals, check-ins, questions, and assignments.
- A separate chat backend would add complexity before the product boundary is stable.
- Local-only messages would fail the two-window teacher/student demo.

## Impact

- Added `/api/workspace/messages`.
- Student stuck signals and teacher-visible check-ins can create `help_request` messages.
- Teacher and student prototypes now share message history through the workspace API.
- Browser workflow tests cover student message submission, teacher message-center visibility, and teacher reply persistence.

## Follow-Up Checkpoints

- Add unread/read state and teacher acknowledgement actions.
- Add retention and deletion rules before real school data is used.
- Revisit real-time transport only after the stable cloud deployment and database layer exist.
- Keep school-admin aggregate-only; do not expose individual message rows to school-admin in the current MVP.
