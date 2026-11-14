# Shravani: Gemini parsing and route explanation

Branch: `shravani`. You join after 2:30 PM. Start with `docs/ONBOARDING_SHRAVANI.md`.

Files you own: `backend/ai/` and `backend/tests/test_ai.py`. Do not edit other modules.
Your module needs only `backend/api/schemas.py` and the sample in
`docs/samples/route_response.sample.json`. You are not blocked by anyone.

## Tasks

| # | Task | Output | Depends on | Done when | Est. |
|---|---|---|---|---|---|
| 1 | Setup (see onboarding), confirm your own Gemini key works with one tiny call | local `.env` | none | Call succeeds | 20 min |
| 2 | `parse_request`: text to `ParseResponse` using Gemini structured output (JSON schema). Handle times like "3 PM", "after lunch" (null if unclear), stairs, heat sensitivity. Low temperature. | `backend/ai/service.py` | 1 | 10 example sentences parse correctly; garbage input returns nulls, not invented values | 90 min |
| 3 | `explain_route`: 2-3 sentence explanation using only numbers in the input. If the coolest route is not meaningfully cooler, say so. | `backend/ai/service.py` | 1 | Output cites only values from the request; checked on the sample | 75 min |
| 4 | Error handling: timeouts, missing key, rate limit. Raise `UpstreamError` (from `backend.api.errors`) with a short, safe message; the API maps it to 502. Never crash routing. | `backend/ai/service.py` | 2, 3 | With a bad key the API returns 502, not a stack trace | 30 min |
| 5 | Tests that do not call the network (mock the client) plus one opt-in live test | `backend/tests/test_ai.py` | 2, 3 | `pytest backend/tests` passes with no key set | 45 min |
| 6 | Stretch: heat-check guidance with fixed red-flag rules (confusion, no sweating, fainting, seizure means "call 911" from code, never from the model) and Spanish output | `backend/ai/heatcheck.py` | 2-4 | Red flags are decided by code | 90 min |

Milestone: parse working by 5:00 PM, explain by 6:00 PM.

## Rules

- Gemini is called only from `backend/ai/`. The key comes from `get_settings()`.
- Verify the current model name in the Gemini docs and set it in `.env` as `GEMINI_MODEL`. Do not hardcode a model that may not exist.
- No medical or legal advice. General safety information only.
- Never log the user's location or the API key.
