# Decision: School Admin As Third Portal

## Decision Title

Add a dedicated school-admin portal as the third TeachFlow surface.

## Date

2026-07-02

## Context

TeachFlow already has teacher and student prototype pages. The product goal has shifted toward an AI school system agent, so the project needs a school-level view that can monitor pilot readiness, class trends, and next actions without becoming another teacher dashboard.

## Options

- Keep school-admin users on the teacher page.
- Add school-admin widgets inside the teacher page.
- Create a dedicated school-admin portal with aggregate data and school-agent recommendations.

## Final Choice

Create `school-admin-prototype.html` as a dedicated third portal and route `school_admin` login there.

## Reasons

- The school role has different questions from teachers and students.
- A dedicated page makes the demo feel like a full school system, not only a classroom tool.
- Aggregate metrics can support pilot decisions without exposing student-level rows.
- The three-role model now maps cleanly to teacher workflow, student support, and school operations.

## Impact

- `auth-ui.js` routes `school_admin` to `school-admin-prototype.html`.
- Top navigation now includes teacher, student, and school-admin portals.
- `workspace-state.js` exposes `schoolAggregate`.
- Browser workflow tests now verify school-admin dashboard entry.

## Follow-Up Checkpoints

- Add multiple active demo classes so school-admin comparisons are more convincing.
- Add pilot feedback and teacher workload summaries.
- Keep school-admin data aggregate-only unless a future product decision changes the boundary.
