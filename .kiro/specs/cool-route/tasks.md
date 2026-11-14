# Cool Route — Tasks

Ordered by dependency. Owners, file paths and estimates come from
`docs/tasks/*.md`; where this list and those files differ, the task files win.
Deadline: working demo in under 8 hours, feature freeze 8:00 PM. No application
code is produced by this spec — this is the plan.

Legend: **[CRITICAL PATH]** marks the shade model chain that everyone's demo
depends on.

## Phase 0 — Skeleton and setup (unblocks everyone)

- [ ] 0.1 Merge skeleton PR; everyone pulls `main`
  - Owner: Shreyas · File: `main` (repo)
  - DoD: teammates can run backend + frontend locally.
  - _Req: enables all_

- [ ] 0.2 Confirm Gemini key works with one tiny call
  - Owner: Shravani · File: local `.env`
  - DoD: a single call succeeds; no key committed.
  - _Req: 4_

- [ ] 0.3 One real TinyFish call; record request/response shape
  - Owner: Shreyas · File: `backend/resources/tinyfish.py`
  - DoD: returns real content for one cooling-center page.
  - _Req: 5_

## Phase 1 — Shade model [CRITICAL PATH]

- [ ] 1.1 **[CRITICAL PATH]** Download demo-area walking graph + building footprints
  - Owner: Rohan · File: `backend/shade/fetch_osm.py` (raw cached in `data/raw/`)
  - Depends on: 0.1
  - DoD: script runs and prints node/edge/building counts.
  - _Req: 1, 2, 3_

- [ ] 1.2 **[CRITICAL PATH]** Shadow projection with pvlib + Shapely for 09:00/12:00/15:00/18:00
  - Owner: Rohan · File: `backend/shade/build_shade.py`
  - Depends on: 1.1
  - DoD: shadow polygons for one time look plausible against the map.
  - Milestone: first shade file by 4:30 PM.
  - _Req: 1, 3_

- [ ] 1.3 **[CRITICAL PATH]** Per-segment shade fraction (shadows + trees + covered walkways)
  - Owner: Rohan · Files: `data/processed/shade_<HHMM>.json`, `backend/shade/covered.json`
  - Depends on: 1.2
  - DoD: four files exist; values vary sensibly (shaded streets high, open plazas low).
  - _Req: 1, 3_

- [ ] 1.4 **[CRITICAL PATH]** Route finder (Dijkstra/A*, shade-weighted cost, stairs/time rules)
  - Owner: Rohan · File: `compute_routes()` in `backend/routing/engine.py`
  - Depends on: 1.3
  - DoD: `POST /route` returns two different routes (Student Pavilion → Mill Ave);
    coolest has higher `shade_pct`; `source: "model"`.
  - Milestone: `/route` working by 6:00 PM.
  - _Req: 1, 2, 3_

- [ ] 1.5 Routing tests with known expectations
  - Owner: Rohan · File: `backend/tests/test_routing.py`
  - Depends on: 1.4
  - DoD: `pytest backend/tests` passes.
  - _Req: 1, 2, 3_

## Phase 2 — Resources (parallel with Phase 1)

- [ ] 2.1 Resource base list (OSM water + libraries + verified cooling centers)
  - Owner: Shreyas · File: `data/resources/curated.json`
  - Depends on: 0.1
  - DoD: ≥10 verified resources, each with `source_url`.
  - _Req: 5_

- [ ] 2.2 `get_resources()` with distance sort + live hours (`last_checked`, `null` unknown)
  - Owner: Shreyas · File: `backend/resources/service.py`
  - Depends on: 0.3, 2.1
  - DoD: `GET /resources` returns real data for Memorial Union; `open_now: null` kept.
  - _Req: 5_

## Phase 3 — AI parse and explain (parallel, not blocked)

- [ ] 3.1 `parse_request`: text → `ParseResponse` via Gemini structured output
  - Owner: Shravani · File: `backend/ai/service.py`
  - Depends on: 0.2
  - DoD: 10 example sentences parse correctly; garbage input returns nulls.
  - Milestone: parse working by 5:00 PM.
  - _Req: 4_

- [ ] 3.2 `explain_route`: 2–3 sentences using only numbers in the input
  - Owner: Shravani · File: `backend/ai/service.py`
  - Depends on: 0.2
  - DoD: output cites only values from the request; checked on the sample.
  - Milestone: explain by 6:00 PM.
  - _Req: 1, 4_

- [ ] 3.3 AI error handling (timeout, missing key, rate limit) → 502, never crash routing
  - Owner: Shravani · File: `backend/ai/service.py`
  - Depends on: 3.1, 3.2
  - DoD: with a bad key the API returns 502, not a stack trace.
  - _Req: 4_

- [ ] 3.4 AI tests (mocked client, no network) + one opt-in live test
  - Owner: Shravani · File: `backend/tests/test_ai.py`
  - Depends on: 3.1, 3.2
  - DoD: `pytest backend/tests` passes with no key set.
  - _Req: 4_

- [ ] 3.5 Stretch: heat-check guidance with fixed code red-flag rules (+ Spanish)
  - Owner: Shravani · File: `backend/ai/heatcheck.py`
  - Depends on: 3.1–3.3
  - DoD: red flags are decided by code, never the model.
  - _Req: 5 (honesty: no medical advice)_

## Phase 4 — Frontend

- [ ] 4.1 Mock mode + visible "SAMPLE DATA" badge (`VITE_USE_MOCKS=true`)
  - Owner: Bhavisha · Files: `frontend/src/mocks/`, switch in `frontend/src/api.ts`
  - Depends on: 0.1
  - DoD: UI develops with the real API off; sample data always labelled.
  - _Req: honesty (sample labelling), 1_

- [ ] 4.2 Route screen form (start/end, current location, tap-on-map, leave-at, prefs)
  - Owner: Bhavisha · File: `frontend/src/components/RouteForm.tsx`
  - Depends on: 0.1
  - DoD: form produces a valid `RouteRequest`.
  - _Req: 1, 2, 3_

- [ ] 4.3 Two-route map + shade-weight slider + comparison card
  - Owner: Bhavisha · Files: `frontend/src/components/RouteMap.tsx`, `ComparisonCard.tsx`
  - Depends on: 4.1 (sample), then 1.4 (real `/route`)
  - DoD: correct on sample data, then on real `/route`; fastest grey, coolest blue;
    "not meaningfully cooler" stated when true; OSM attribution shown.
  - Milestone: clickable UI on sample by 4:30 PM, real API by 6:00 PM.
  - _Req: 1, 3_

- [ ] 4.4 Help now screen (big button, nearest resources map + list, status badges, tap-to-route)
  - Owner: Bhavisha · File: `frontend/src/components/HelpNow.tsx`
  - Depends on: 2.2 (`/resources`)
  - DoD: works on mock then real data; `null` renders "hours unknown".
  - _Req: 5_

- [ ] 4.5 Plain-English box (`/parse` fills form, `/explain` under comparison, graceful on 501/fail)
  - Owner: Bhavisha · File: `frontend/src/components/AskBox.tsx`
  - Depends on: 3.1, 3.2 (`/parse`, `/explain`)
  - DoD: UI stays usable when these return 501 or fail.
  - _Req: 4_

- [ ] 4.6 Saved preferences in `localStorage` (try/catch, loading/empty/error states, a11y)
  - Owner: Bhavisha · File: `frontend/src/hooks/usePrefs.ts`
  - Depends on: 4.2
  - DoD: reload keeps preferences.
  - _Req: 6_

## Phase 5 — Integration, APK, deploy

- [ ] 5.1 Capacitor APK build + install on real phone
  - Owner: Shreyas · File: `mobile/`
  - Depends on: frontend builds (4.x), retest after each frontend milestone
  - DoD: APK installs, opens, reaches the API.
  - _Req: all (delivery)_

- [ ] 5.2 Integration + bug fixing; feature freeze 8:00 PM
  - Owner: Shreyas (with everyone)
  - Depends on: 1.4, 2.2, 3.x, 4.x
  - DoD: full flow works on the phone.
  - _Req: all_

- [ ] 5.3 AWS deploy (budget alarm $20, S3 web + data, try Lambda + API Gateway, else laptop)
  - Owner: Shreyas
  - Depends on: 5.2
  - DoD: demo URL works, or the fallback is documented.
  - _Req: all (delivery)_

- [ ] 5.4 README, screenshots, demo script
  - Owner: Shreyas · File: `README.md`
  - Depends on: 5.2
  - DoD: matches what actually works.
  - _Req: all (honesty: document what is real)_

## Critical path summary

**1.1 → 1.2 → 1.3 → 1.4** (shade download → shadow projection → per-segment shade
→ route finder) is the critical path. `/route` is blocked until it lands, and the
route screen (4.3), integration (5.2) and the demo all depend on it. Milestones:
first shade file 4:30 PM, `/route` 6:00 PM. If it slips, trigger Risk 1's fallback.

## Risks and fallbacks

1. **Shade math too slow / sun projection not working by 4:30 PM.**
   Fallback: estimate shade from building height and tree density per segment
   (per `docs/ARCHITECTURE.md`), keep the same `shade_<HHMM>.json` shape so
   routing and the contract are unchanged, and say so in the README.

2. **TinyFish page unreadable.** Fallback: leave `open_now: null` and omit
   `last_checked`; the UI shows "hours unknown". Never guess hours. Resources
   still render from the curated base list.

3. **Gemini rate limit (or missing key / timeout).** Fallback: the AI module
   raises a clear error mapped to `502`; `/parse` and `/explain` fail gracefully
   and the app stays fully usable through the manual form. Routing never depends
   on Gemini.

4. **APK build failure late in the day.** Fallback: ship the hosted web build as
   an installable page (per the architecture doc) instead of the debug APK.

5. **API reachable only over HTTPS from the APK.** The APK runs at
   `https://localhost`, so plain `http://<laptop-ip>:8000` is blocked as mixed
   content. Fallback: serve the API over HTTPS via API Gateway or a tunnel to the
   demo laptop, and set `VITE_API_URL` before building the frontend.
