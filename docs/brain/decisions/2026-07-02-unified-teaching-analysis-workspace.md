# Decision: Unified Teaching Analysis Workspace

## Date

2026-07-02

## Background

The teacher prototype had separate top-level channels for `理解诊断`, `分层干预`, and `学生跟进`, while the product direction had already moved toward one teacher decision loop. This made the sidebar feel crowded and forced teachers to jump between pages to understand one class situation.

## Options

- Keep the three channels separate and only improve visual styling.
- Merge diagnosis and intervention into `教学分析`, but keep `学生跟进` separate.
- Merge diagnosis, intervention, and student follow-up into one `教学分析` workspace, with detailed content hidden behind on-demand modals.

## Final Choice

Merge diagnosis, intervention, and student follow-up into one `教学分析` workspace.

## Reasons

- The teacher workflow is one loop: evidence -> diagnosis -> intervention -> follow-up.
- The sidebar becomes simpler and easier to demo.
- The default page can show summaries first, while detailed evidence and student support profiles appear only when the teacher asks for them.
- The change preserves the teacher-control principle: AI surfaces drafts and evidence, but the teacher still opens, reviews, edits, and approves.

## Impact

- Removed standalone teacher navigation entries for `理解诊断`, `分层干预`, and `学生跟进`.
- Added modal detail views for misconception evidence, differentiated intervention plans, and student support profiles.
- Updated browser workflow coverage to test the new student-support detail modal.

## Follow-up Checkpoints

- Watch whether modal detail content becomes too dense as more modules are added.
- Add real teacher actions inside modals: approve support message, send Level 1 material, schedule short check-in, dismiss for now.
- Keep private student reflections out of teacher modal views unless a future school-approved consent model explicitly changes this.
