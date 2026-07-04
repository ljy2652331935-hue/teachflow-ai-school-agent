# Decision: Render Public Demo Deployment

## Date

2026-07-02

## Background

TeachFlow needs a public URL so the developer can test teacher and student flows from different browser windows. The current active app is a plain Node.js static/API server with local JSON persistence and demo sessions.

## Options

- Use a temporary local tunnel such as ngrok or Cloudflare Tunnel.
- Deploy to a static host.
- Deploy to a Node web-service host with a public URL.

## Final Choice

Prepare a Render Blueprint deployment for a public demo Node web service.

## Reasons

- TeachFlow needs API routes and session cookies, so a static-only host is not enough.
- Render supports Node web services with build and start commands.
- Render Blueprint config can live in the repository and preserve the active app subdirectory through `rootDir`.
- A public demo URL is enough for current teacher/student window testing.

## Impact

- Added root `render.yaml`.
- Added `npm start` to the active app package.
- Updated `server.js` to bind to `0.0.0.0` when `PORT` is provided by a cloud host.
- Added `DEPLOYMENT.md` with public-demo account and limit notes.

## Follow-up Checkpoints

- User still needs to connect the repository to a cloud platform or provide deployment authorization.
- Do not put real student data on the public demo URL.
- If the demo becomes shared beyond a small testing circle, add password-based demo access, reset controls, CSRF, and retention limits.
