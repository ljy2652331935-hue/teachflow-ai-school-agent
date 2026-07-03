# TeachFlow Project Rules For Codex

## Project

TeachFlow is a teacher-controlled AI school system MVP. The current school-trial app lives in `outputs/teachflow-school-live` and is identified in its own `package.json` as `teachflow-school-live`.

The older demo app remains in `outputs/teachflow-v0.1` for reference and demo-regression work.

It focuses on anonymised student misconception diagnosis, differentiated intervention generation, teacher approval/export, student learning support, teacher/student prototype views, a shared workspace API, and role/class access boundaries.

## Before Complex Work

- Read `docs/brain/INDEX.md` and `docs/brain/CURRENT_STATE.md` first.
- For school-trial implementation work, also read `outputs/teachflow-school-live/README.md`, `outputs/teachflow-school-live/package.json`, and the relevant engine/prototype files.
- For legacy demo work, use `outputs/teachflow-v0.1/`.
- If the knowledge base is stale, update the affected `docs/brain` files as part of the task.

## Common Commands

Run commands from `outputs/teachflow-school-live` unless noted otherwise.

- Start local app: `npm.cmd run dev`
- Start explicit port: `node server.js --port=5175`
- Run full checks: `npm.cmd run check`
- Quick syntax check example: `node --check workspace-state.js`

The school-live app is usually opened at `http://127.0.0.1:5175/login.html`.

## Important Directories

- `outputs/teachflow-school-live/`: current clean school-trial app with teacher/student registration and classroom invite links.
- `outputs/teachflow-v0.1/`: older demo app; keep as reference unless explicitly asked to change it.
- `outputs/teachflow-school-live/tests/`: clean registration and invite-link tests.
- `outputs/teachflow-v0.1/tests/`: deterministic regression and API boundary tests.
- `outputs/teachflow-v0.1/schemas/`: JSON schemas and TypeScript data model.
- `outputs/teachflow-v0.1/data/`: sample workspace and local persisted demo workspace.
- `outputs/teachflow-demo-case/`: original demonstration case materials.
- `outputs/teachflow-mvp/`: earlier MVP prototype; keep as reference unless explicitly asked to migrate.
- `docs/brain/`: Codex + Obsidian project brain.

## Specialist Agent Workflow

- `agency-agents` is installed as a Codex custom-agent library in `~/.codex/agents/`.
- Use specialist agents by phase, not all at once. Start with architecture, then backend/data, prompt/schema, frontend/UX, security/privacy, code review, and documentation.
- Recommended names: `Software Architect`, `Backend Architect`, `Prompt Engineer`, `Frontend Developer`, `UX Architect`, `Security Architect`, `Data Privacy Officer`, `Code Reviewer`, and `Technical Writer`.
- Keep TeachFlow's product direction in control: teacher workflow first, AI drafts and teachers decide, no student surveillance or unnecessary scope expansion.
- For the project-specific usage rhythm, read `docs/brain/AGENT_WORKFLOW.md`.

## Code Style And Conventions

- This project uses plain Node.js and browser JavaScript, with no external runtime dependencies in the active app.
- Prefer deterministic, local logic for MVP behavior. Do not introduce cloud services or package dependencies without a clear reason.
- Preserve the teacher-control principle: AI suggests, teacher approves.
- Preserve alias-only privacy. Use student aliases such as `S001`, `S002`; do not add real names, emails, school IDs, tokens, or private production data.
- Keep changes scoped to the active app unless the user asks for broader cleanup.
- Use existing helper patterns and module style before adding new abstractions.

## Documentation Rules

- After completing a feature, bug fix, refactor, architecture change, or meaningful UI/data change, update `docs/brain/devlog/YYYY-MM-DD.md`.
- If making an important product or technical choice, add `docs/brain/decisions/YYYY-MM-DD-title.md`.
- Do not record secrets, keys, tokens, private account details, customer data, or production-sensitive configuration in the knowledge base.
- Keep project-brain notes concise, factual, and current. Mark uncertain items as `待确认`.
