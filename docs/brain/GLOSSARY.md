# Glossary

## TeachFlow

The project name. A teacher-controlled AI school system MVP for diagnosis, intervention, and student learning support.

## Misconception Diagnosis

The process of reading anonymised student answers and identifying what students likely misunderstood, with evidence quotes.

## Differentiated Intervention

A generated teaching response split by learner support level, usually Level 1, Level 2, and Level 3.

## Teacher Control Layer

The approval, editing, versioning, export, audit, and rollback layer that keeps the teacher in charge before material reaches students.

## Student Alias

An anonymised student identifier such as `S002`. Real student names or identifiers should not be stored in demo docs/data.

## Student Memory

Teacher-only anonymised learning-state memory about what an alias understands, where they are stuck, and what should happen next.

## Understanding Map

Alias-level representation of understood concepts, support-needed concepts, evidence, and next actions.

## Stuck Signal

A bounded student-submitted signal such as `公式没懂` or `图示没懂`. It is not an unrestricted chatbot message.

## Workspace

The shared local data object for the current demo school/class/topic/students/questions/stuck signals/materials. It is cached in the browser and persisted through `/api/workspace`.

## Role Context

The current MVP representation of who is accessing the system. Examples: teacher, student, school_admin. Currently passed as demo context, not real authentication.

## Class Boundary

The rule that a user can access only the class IDs assigned to their account.

## School Agent

Deterministic local agent layer that summarizes readiness, priorities, guardrails, and next actions for the school-system view.

## Dual Agent

Teacher and student local agent logic used by the newer prototype pages.

## Teacher-Approved Content

Material that AI may draft but teacher must approve before student use.
