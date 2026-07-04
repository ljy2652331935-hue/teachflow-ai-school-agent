# AI School Agent Architecture Boundaries

## Decision Title

Split TeachFlow's agent architecture into student-private support, anonymised learning signals, teacher-controlled analysis, and a central governance/safety layer.

## Date

2026-07-02

## Background

TeachFlow is moving from a teacher-side tool toward an AI school agent system. A single broad "student Agent" creates trust and privacy risks because schools may worry that student conversations are exposed, AI may complete homework, or AI may bypass teacher judgment.

## Options

1. Keep one student Agent and one teacher Agent with a shared memory layer.
2. Split the student side into a private learning assistant and a learning signal extractor, then route shareable evidence through governance and safety.
3. Defer the agent architecture until real AI integration.

## Final Choice

Use option 2 as the long-term architecture direction.

## Reason

This gives TeachFlow a clearer school-trial story: students can receive private learning help, teachers receive anonymised evidence, and official learning content remains teacher-approved. It also keeps current development focused on the teacher-controlled core.

## Impact

- Student private memory, class anonymised evidence, and teacher-approved content are treated as different permission layers.
- The school-admin portal now includes a visible "系统架构" channel for this architecture.
- `docs/brain/AI_SCHOOL_AGENT_ARCHITECTURE.md` is the canonical long-term architecture note.
- Future student-Agent work should not expose full raw student chat to teachers by default.

## Follow-Up Checkpoints

- When adding Teacher Inbox, keep it evidence-based and alias-only.
- When adding richer student memory, define what is private, shareable, and teacher-approved.
- Before real AI integration, review the governance/safety layer for prompt boundaries, logging, and student support limits.
