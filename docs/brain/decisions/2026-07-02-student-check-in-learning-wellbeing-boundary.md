# Student Check-in Learning Wellbeing Boundary

## Decision Title

Add Student Check-in as AI 学习关怀助手, not an AI therapist or psychology teacher.

## Date

2026-07-02

## Background

TeachFlow's student Agent can become more useful if students can express learning frustration, pressure, reluctance, and confusion. However, a school system must not present this as therapy, diagnosis, counselling, or a replacement for safeguarding staff.

## Options

1. Build a broad AI psychology teacher that lets teachers inspect full student emotional conversations.
2. Do not add wellbeing or frustration support at all.
3. Add a narrow Student Check-in feature that turns student learning frustration into learning support signals, with privacy by default and optional teacher-visible summaries.

## Final Choice

Use option 3.

## Reason

This preserves the educational value while keeping the boundary school-safe: students can be heard, teachers can act on learning-relevant summaries, and TeachFlow avoids diagnosing, treating, grading, or exposing full private conversations.

## Impact

- Student page now includes `学习关怀` / Student Check-in.
- Students can choose `private`, `ask_ai_first`, or `teacher_summary`.
- Teacher page now includes Teacher Inbox and Student Support Profile based on shared summaries.
- Workspace API now has `/api/workspace/check-ins`.
- Teacher-scoped workspace responses omit raw private notes and private reflections.
- Current MVP still lacks a real safeguarding role and is not ready for real wellbeing data.

## Follow-Up Checkpoints

- Add school-approved student-facing non-therapy and privacy copy before real pilots.
- Define designated safeguarding role, escalation workflow, and retention/deletion policy.
- Add route-level validation and content limits for check-in text.
- Review again before connecting real AI to Student Check-in.
