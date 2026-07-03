# Agency Agents Workflow

Last updated: 2026-07-02

## Purpose

Use `agency-agents` as a Codex specialist role library for TeachFlow. The point is not to make every agent change the project at once; the point is to make Codex think and work through the right expert lens at the right phase.

The agents were installed as Codex custom-agent TOML files in:

```text
~/.codex/agents/
```

Local source copy:

```text
C:\Users\ljy26\Downloads\agency-agents
```

## Recommended Sequence

1. `Software Architect`: inspect architecture, module boundaries, risks, and refactor priority.
2. `Backend Architect`: design data models, API shape, validation, persistence, and role boundaries.
3. `Prompt Engineer`: design AI workflow prompts, JSON schemas, failure handling, and evaluation criteria.
4. `Frontend Developer`: implement teacher/student UI changes using the existing plain browser JavaScript style.
5. `UX Architect`: simplify teacher workflow and make AI evidence, approval, and export clear.
6. `Security Architect` plus `Data Privacy Officer`: review student privacy, alias-only data, authorization, audit logs, and school-readiness.
7. `Code Reviewer`: review bugs, tests, regressions, and missing verification.
8. `Technical Writer`: update README, pilot notes, and handoff documentation.

## Usage Pattern

Ask for one specialist at a time:

```text
Use the Software Architect agent to review the current TeachFlow architecture.
Do not write code yet. Focus on module boundaries, data flow, and risk.
```

Then move to the next phase only after the previous phase has produced a clear recommendation or a small verified change.

## TeachFlow Guardrails

- TeachFlow is an AI Teaching Control System, not a generic chatbot.
- AI drafts; teachers decide.
- Use anonymised student aliases only.
- Every diagnosis should be grounded in evidence from student work.
- Every intervention should link back to a diagnosed misconception.
- Teacher edits, approvals, exports, and rollbacks should become auditable over time.
- Do not add parent portal, LMS integration, automatic grading, surveillance, or social features unless explicitly requested.

## Current Verification

- `agency-agents` source was downloaded to `C:\Users\ljy26\Downloads\agency-agents`.
- 233 Codex agent TOML files were generated.
- 233 TOML files were installed in `~/.codex/agents/`.
- Key installed roles include `Software Architect`, `Backend Architect`, `Frontend Developer`, `Prompt Engineer`, `UX Architect`, `Code Reviewer`, and `Technical Writer`.
- The source library does not include an exact `Security Reviewer` role; use `Security Architect`, `Data Privacy Officer`, `Application Security Engineer`, or `Compliance Auditor` depending on the review.
- `codex --help` exists on PATH but could not be executed from this Windows sandbox due `Access is denied`; the installed TOML files were verified directly on disk.
