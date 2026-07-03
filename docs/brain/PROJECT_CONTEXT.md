# Project Context

## Project Summary

TeachFlow is a teacher-controlled AI school system MVP. It helps teachers turn anonymised student responses into misconception diagnosis, differentiated teaching interventions, approved learning materials, student support workflows, and school-safe agent guidance.

The current active app is `outputs/teachflow-v0.1`, named `teachflow-v0.3` in `package.json`.

## Target Users

- Teacher: primary user. Reviews diagnosis, edits and approves AI-generated materials, exports/publishes content, and monitors student learning state.
- Student: uses alias-based student view to access approved materials, submit assignments/questions, and send stuck signals.
- School/admin stakeholder: future or partial user. Should see aggregate progress and safety posture, not personal student details. Current implementation has only a lightweight `school_admin` boundary model.

## Product Principles

- Teacher remains in control. AI may diagnose, suggest, draft, and summarize, but publication and approval should remain teacher-owned.
- Students are represented by aliases only, such as `S002`.
- Outputs must preserve evidence traceability: misconception and intervention claims should link back to student evidence where possible.
- Avoid automatic grading claims. The system is for teaching support, not official assessment or ranking.
- Student support should be bounded by teacher-approved content and school-safe access rules.

## Current Core Capabilities

- Misconception diagnosis from anonymised quiz responses.
- Differentiated intervention generation for Level 1, Level 2, and Level 3 needs.
- Teacher control layer with section review, approval, versioning, audit, export, and rollback helpers.
- Student memory and follow-up micro-quiz analysis.
- Controlled student portal and understanding map.
- Teacher and student prototype pages with role switch header.
- Dual teacher/student agent logic for local deterministic guidance.
- Shared workspace state with local persistence and API-backed synchronization.
- Account, role, and class boundaries for teacher/student/school-admin contexts.

## Business And Safety Rules

- Use aliases only; do not store real student identity in repo docs or demo data.
- Teacher can inspect class-level and alias-level evidence for their class.
- Student can read and write only their own alias state.
- School admin should not see individual student details in this MVP.
- AI suggestions should be editable and approval-gated.
- Do not add secrets, API keys, production account details, or customer private data to docs or local demo files.

## Out Of Scope Or Not Yet Done

- Real authentication sessions: currently represented through demo context/query parameters.
- Real LMS/SIS integration.
- Real image/video generation.
- Parent portal.
- Production database.
- Production-grade privacy/security review.
- Full school admin dashboard.

## Demo Domain

The main teaching scenario is Fourier Transform / time domain vs frequency domain. The original demo materials live in `outputs/teachflow-demo-case/`.
