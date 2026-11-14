# Shravani: start here

Welcome. You own the Gemini module. Read this page (5 minutes), then `docs/tasks/shravani.md`.

## What we are building

Cool Route finds the coolest walking route across ASU Tempe, not the fastest, and
finds the nearest open water or cooling spot. Full picture: `docs/ARCHITECTURE.md`.

Your part: turn "3 PM, avoid stairs" into route settings, and explain in plain
language why the chosen route is cooler.

## Setup (15 minutes)

1. Accept the GitHub invitation: https://github.com/iamshrey10/sunhacks-sparkys/invitations
2. Get a Gemini API key from Google AI Studio.
3. Follow "One-time setup" in `CONTRIBUTING.md` using the branch `shravani`.
4. Put your key in `.env` as `GEMINI_API_KEY=...`. Never commit `.env`.
5. Check: `pytest backend/tests` passes and http://localhost:8000/health shows `gemini_configured: true`.

## Where your code goes

- `backend/ai/service.py`: two functions already stubbed, `parse_request` and `explain_route`. Keep the signatures.
- Input/output shapes: `backend/api/schemas.py` (`ParseRequest`, `ParseResponse`, `ExplainRequest`, `ExplainResponse`).
- A sample route to test with: `docs/samples/route_response.sample.json`.

The API already routes `POST /parse` and `POST /explain` to your functions. Try them
at http://localhost:8000/docs once you have something working.

## Working rules

- Work only on your branch and only in `backend/ai/`.
- Commit often, push at least hourly (commands in `CONTRIBUTING.md`).
- Open a pull request into `main` when a task is done. Shreyas reviews and merges.
- Ask Shreyas before changing `schemas.py`; the frontend depends on it.
