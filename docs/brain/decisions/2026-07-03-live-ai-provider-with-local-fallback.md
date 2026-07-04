# Live AI Provider With Local Fallback

## Decision Title

Live AI Provider With Local Fallback

## Date

2026-07-03

## Background

TeachFlow is moving from deterministic local Agent behavior toward a real LLM-backed teacher/student Agent system. The app still needs to remain stable for two-browser manual testing, demos, and school-trial preparation even when a model key is missing, invalid, rate-limited, or the network is unavailable.

## Options

- Replace local Agent logic with direct OpenAI calls.
- Keep local Agent logic only and delay live AI.
- Add a provider layer that calls OpenAI when configured and falls back to deterministic local Agent output when live calls fail.

## Final Choice

Add a provider layer that calls OpenAI when configured and falls back to deterministic local Agent output when live calls fail.

## Reasons

- Keeps the demo stable while enabling real AI behavior.
- Preserves teacher control: live outputs are drafts, not automatic actions.
- Avoids exposing API keys in frontend code.
- Makes tests deterministic by forcing local mode in automated tests.
- Allows the model, timeout, and provider behavior to change without rewriting UI flows.

## Impact

- New backend routes exist under `/api/ai/*`.
- Existing student and teacher Agent flows can use live AI without exposing the key to the browser.
- Automated tests run with `TEACHFLOW_AI_MODE=local` to avoid network calls and cost.
- A valid local `OPENAI_API_KEY` is required for live mode.

## Follow-Up Checkpoints

- Replace any exposed or pasted API key with a new secure key before serious testing.
- Add a visible AI mode indicator in teacher/student UI if live/local distinction becomes important for pilots.
- Add rate limits and request-size checks before using real student data.
- Add prompt/schema evals for teacher Agent and student Agent before school trial.
