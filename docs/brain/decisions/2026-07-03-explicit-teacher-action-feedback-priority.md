# Explicit Teacher Action Feedback Priority

## Decision Title

Explicit teacher-action feedback has priority over unrelated later signals

## Date

2026-07-03

## Background

TeachFlow now lets students respond directly to a teacher-approved action with structured feedback such as `improved` or `still_stuck`. The outcome evaluator also watches later questions, stuck signals, assignments, and check-ins. A browser test showed that a later unlinked stuck signal could overwrite a direct `improved` button response for the same teacher action.

## Options

- Treat every later student signal as evidence for the most recent teacher action.
- Treat explicit linked button feedback as the primary evidence for that teacher action, and use later unlinked signals only when no explicit response exists.
- Require the teacher to manually classify every later signal before outcome evaluation.

## Final Choice

Treat explicit linked button feedback as the primary evidence for that teacher action. Later unlinked signals are ignored for that action once it has `studentResponseAt` or `studentResponseType`.

## Reason

The button response is intentionally tied to one teacher action through `linkedTeacherActionId`. Later general stuck signals may be about another learning moment and should not automatically reverse the student's direct feedback.

## Impact

- Outcome evaluation becomes more stable and explainable.
- Student feedback buttons become a trustworthy part of the teacher-action loop.
- Later unlinked signals still matter for actions without explicit feedback and for broader teaching analysis.

## Follow-up Checkpoints

- Add a teacher-side filter for outcome states.
- Consider a separate "new concern after improvement" alert if a later unlinked stuck signal appears after an explicit improved response.
- Revisit this rule when real AI summarization or more granular activity IDs are introduced.
