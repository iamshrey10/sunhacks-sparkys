# Shravani: start here

You own the Gemini module: turning "3 PM, avoid stairs" into route settings, and
explaining why a route is cooler. Nobody needs to finish anything before you
start; you only need the contract and a sample route.
Background: `docs/ONBOARDING_SHRAVANI.md`. Full task list: `docs/tasks/shravani.md`.

## A. Setup (15 minutes)

1. Accept the GitHub invitation (already done if you can see the repo): https://github.com/iamshrey10/sunhacks-sparkys
2. Install Git and Python 3.12 (check with `python3.12 --version`).
3. In your coding tool, turn off co-author / attribution lines on commits and
   pull requests. Do this before your first commit.
4. Get your own Gemini API key from Google AI Studio (aistudio.google.com).
   Do not share it or paste it into any file except `.env`.
5. Clone and switch to your branch:
   ```bash
   git clone https://github.com/iamshrey10/sunhacks-sparkys.git
   cd sunhacks-sparkys
   git checkout shravani
   git merge origin/main
   ```
6. Create the environment:
   ```bash
   python3.12 -m venv .venv
   source .venv/bin/activate            # Windows: .venv\Scripts\activate
   pip install -r backend/requirements.txt
   cp .env.example .env
   ```
7. Open `.env` and fill in `GEMINI_API_KEY=` with your key. Look up a current
   Gemini model name in the Gemini API docs and set `GEMINI_MODEL=` to it
   (a fast, low-cost model is right for parsing). Never commit `.env`.
8. Check it works:
   ```bash
   pytest backend/tests                 # expect: 3 passed
   uvicorn backend.api.main:app --reload --port 8000
   ```
   Open http://localhost:8000/health. It should show `"status":"ok"` and
   `"gemini_configured": true`.
9. Tell your coding tool: "Read docs/ARCHITECTURE.md and docs/tasks/shravani.md.
   I only edit files in backend/ai/. Do not touch other modules."

## B. Your tasks, in order

All your code goes in `backend/ai/service.py`. Two functions are already stubbed;
keep their names and signatures. Types are in `backend/api/schemas.py`.
A sample route to test with: `docs/samples/route_response.sample.json`.

**Task 1 (about 20 min): prove the key works.**
Write a tiny script in `scripts/` (or run in a Python shell) that sends one short
prompt with the `google-genai` package and prints the reply. Done when it prints
a real answer. Do not commit anything containing the key.

**Task 2 (about 90 min): `parse_request`.**
Input `ParseRequest(text=...)`, output `ParseResponse`.
- Use Gemini structured output: set the response type to JSON and pass a schema
  matching `ParseResponse` (check the current `google-genai` docs for the exact
  config names).
- Use a low temperature.
- It must extract: leave-at time as `HH:MM` 24-hour (or `null` if unclear),
  `destination_text` (or `null`), `avoid_stairs`, and `heat_sensitivity`
  (`low`, `normal` or `high`).
- If the text does not say something, return the default or `null`. Never invent values.
- Done when these all parse correctly:
  - "3 PM, avoid stairs" gives 15:00 and avoid_stairs true
  - "I get overheated easily, leave around 2:30" gives heat_sensitivity high and 14:30
  - "Walk to Mill Ave" gives destination "Mill Ave" and no time
  - "asdf" gives all defaults and nulls
  - Plus 6 more sentences of your own.
- Try it at http://localhost:8000/docs under `POST /parse`.

**Task 3 (about 75 min): `explain_route`.**
Input `ExplainRequest` (a `RouteResponse` plus preferences), output `ExplainResponse`.
- Write 2 to 3 plain sentences using only numbers present in the input
  (extra minutes, shade %, sun-exposed minutes).
- If the coolest route is not meaningfully cooler or is much longer, say that honestly.
- No medical or legal advice.
- Done when the output on the sample route cites only values from that sample.

**Task 4 (about 30 min): errors.**
Missing key, timeout and rate limit must raise a clear error that the API can
turn into a `502`: `from backend.api.errors import UpstreamError` and `raise UpstreamError("short safe message")`. The handler already exists in `main.py`. Routing must never crash because Gemini failed.

**Task 5 (about 45 min): tests in `backend/tests/test_ai.py`.**
Mock the Gemini client so tests run with no key and no network. `pytest backend/tests` must pass.

**Task 6 (stretch): heat check.** `backend/ai/heatcheck.py`. Danger signs
(confusion, no sweating, fainting, seizure) must trigger "call 911" from code,
never from the model's judgement. Optional Spanish output.

## C. Saving your work

Every 30 to 60 minutes:
```bash
git status
git add backend/ai backend/tests/test_ai.py
git commit -m "Short message about what changed"
git push -u origin shravani          # later pushes: git push
```
When a task is done, open a pull request:
```bash
gh pr create --base main --head shravani --title "Short summary" --body "What changed and how to test it"
```
Shreyas reviews and merges. Then run `git merge origin/main` on your branch.

## D. Rules

- Only edit `backend/ai/` and your test file. Do not edit `backend/api/schemas.py`
  without asking Shreyas; the frontend depends on it.
- Gemini is called only from `backend/ai/`. Never log the API key or a user's location.
- Add files by name, not `git add .`. Never commit `.env`.
- Never run `git push --force` or `git reset --hard`.
- Stuck for more than 20 minutes? Message Shreyas.
