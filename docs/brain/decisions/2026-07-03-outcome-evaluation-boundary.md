# Decision: Outcome Evaluation Uses Learning Signals, Not Grading

## Date

2026-07-03

## Background

TeachFlow now lets teachers approve Agent actions such as support messages, assigned materials, and short follow-ups. The next school-system step is to help teachers see whether later student learning signals suggest improvement or continued need.

## Options

1. Treat outcome evaluation as automatic grading.
2. Treat outcome evaluation as a causal claim that a teacher action directly caused improvement.
3. Treat outcome evaluation as a conservative learning-signal comparison after teacher-approved actions.

## Final Choice

Use option 3: conservative learning-signal comparison.

## Reasons

- Fits the teacher-control principle: the system suggests a read, the teacher decides what it means.
- Avoids overstating causality from sparse MVP data.
- Keeps the boundary clear: this is not grading, psychological assessment, or automated performance labeling.
- Works with the current local data model: messages, stuck signals, questions, check-ins, assignment state, and audit events.

## Impact

- Added `outcome-evaluation-engine.js`.
- Teacher Agent briefing now includes `outcomeEvaluation`.
- Teacher `教学分析` shows a compact `成效回流` panel.
- The engine returns `已改善`, `仍需跟进`, `继续观察`, or `等待后续信号` rather than final judgments.

## Follow-up Checks

- Add timestamped assignment attempts for more precise before/after comparison.
- Add read/unread states for teacher-approved actions.
- Add a richer outcome timeline after the demo data model stabilizes.
