# TeachFlow Cloud Demo Deployment

This project is currently a public demo, not a production system. Do not enter real student names, emails, school IDs, secrets, or sensitive personal data.

## Recommended Demo Host: Render

The repository now includes a root-level `render.yaml` Blueprint for a public Render web service.

Render settings:

- Runtime: Node
- Root directory: `outputs/teachflow-v0.1`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/`
- Demo workspace file: `/tmp/teachflow-workspace-state.json`

After deployment, Render provides a public `https://...onrender.com` URL. Open that URL and use `login.html`.

## Test Accounts

The login page shows clickable demo identities. Use these two for two-window testing:

- teacher: `test-teacher` / `teacher`
- Student: `test-student-s002` / `student S002`

Both are scoped to the same demo class and the same anonymous student alias `S002`, so student submissions, stuck signals, and check-ins can be checked from the teacher view.

## Two-Window Test Flow

1. Open the deployed URL in one browser window and choose `teacher`.
2. Open the deployed URL in an incognito/private window or another browser and choose `student S002`.
3. In the student window, submit homework, ask a question, send a stuck signal, or share a learning check-in.
4. In the teacher window, open `learninganalysis` and check that the new signal appears in the workspace and detail modal.

## current Limits

- Demo accounts have no passwords. Anyone with the public URL can open the demo identities.
- Sessions are in memory. A server restart logs users out.
- Workspace persistence is a local JSON file. On hosted free instances, data may reset after restart/redeploy.
- This is suitable for public demo testing only, not real student data.
