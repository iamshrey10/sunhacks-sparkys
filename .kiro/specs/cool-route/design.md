# Cool Route — Design

Source of truth: `docs/ARCHITECTURE.md`, `docs/API_CONTRACT.md`,
`backend/api/schemas.py`. This design restates how those pieces fit for the
"Cool Route" spec and must not change the contract. Where a need exceeds the
contract, it is recorded under "Contract gaps" instead of editing the schema.

## Overview

A React + Leaflet client (served as a hosted web build and packaged into an
Android APK with Capacitor) talks only to a FastAPI backend over HTTPS. The
backend is split into four independent modules, each owned by one developer. No
API keys ship in the app; Gemini and TinyFish are called only from the backend
using keys from `.env`. There is no database: routing uses precomputed JSON in
`data/processed/`, and user preferences live in phone local storage.

```
 Phone (Capacitor APK / browser)
   React + Leaflet UI  ──HTTPS──►  FastAPI (backend/api)
                                     ├─ routing/   Rohan    route finder + shade scores
                                     ├─ resources/ Shreyas  water / cooling spots, live hours (TinyFish)
                                     └─ ai/        Shravani Gemini: parse request, explain route
   data/processed/*.json  ◄── built offline by backend/shade (Rohan)
```

## Module boundaries

Each developer edits only their own module. A contract change requires a single
pull request touching `backend/api/schemas.py`, `frontend/src/types.ts` and
`docs/API_CONTRACT.md` together, reviewed by Shreyas — and this spec deliberately
plans to avoid that.

| Module | Path | Owner | Talks to | Depends on |
|---|---|---|---|---|
| API shell + contract + integration + APK + deploy | `backend/api/`, `mobile/` | Shreyas | all modules, frontend | schemas |
| Resources + live hours | `backend/resources/`, `data/resources/` | Shreyas | TinyFish | curated list, OSM |
| Shade precompute | `backend/shade/` | Rohan | OSM (offline) | OSMnx data |
| Route finder | `backend/routing/` | Rohan | `data/processed/` | shade files |
| Frontend | `frontend/` | Bhavisha | FastAPI only | all endpoints |
| Gemini parse + explain | `backend/ai/` | Shravani | Gemini | schemas + sample |

Independence is preserved by the shared contract: every module reads and writes
only the Pydantic models in `backend/api/schemas.py`, and the frontend mirrors
them in `frontend/src/types.ts`. A module can be stubbed to return `501` and the
rest of the app keeps working.

## Components and interfaces

The API surface is fixed by the contract. No endpoint, field, type or status
code below is added or altered by this spec.

### FastAPI endpoints (owner)

- `GET /health` (Shreyas) → `Health { status, gemini_configured, tinyfish_configured }`.
- `POST /route` (Rohan) → `RouteResponse`. Core routing.
- `GET /resources?lat&lng&radius_m` (Shreyas) → `ResourcesResponse`.
- `POST /parse` (Shravani) → `ParseResponse`.
- `POST /explain` (Shravani) → `ExplainResponse`.

Errors: `501` module not implemented yet, `422` invalid input, `502` upstream
(Gemini / TinyFish) failed. Clients must handle all three.

### Routing (Rohan)

`compute_routes(req: RouteRequest) -> RouteResponse` in
`backend/routing/engine.py`. Signature is fixed. Per-segment cost:
`length * (1 + shade_weight * sun_fraction * k)`, with `k` rising with
`heat_sensitivity`. Fastest route uses `length` only. `highway=steps` excluded
when `avoid_stairs` is true. `depart_time` snaps to the nearest precomputed layer
and the chosen layer is returned in `shade_layer`. The response sets
`source: "model"`; sample data is never returned.

### Shade precompute (Rohan, offline)

`backend/shade/fetch_osm.py` and `backend/shade/build_shade.py` produce
`data/processed/shade_<HHMM>.json` (segment id → shade fraction 0–1) for 09:00,
12:00, 15:00, 18:00 on a mid-July date using pvlib (sun position) and Shapely
(shadow projection), plus tree points and hand-labelled covered walkways in
`backend/shade/covered.json`. This runs before the API serves routes and is the
**critical path** (see Tasks).

### Resources (Shreyas)

`get_resources()` in `backend/resources/service.py` builds from OSM drinking
water + libraries and the hand-verified `data/resources/curated.json`, sorts by
distance, and attaches live hours via `backend/resources/tinyfish.py`. TinyFish
reads official hours pages; results are cached with `last_checked`. If a page
cannot be read, `open_now` stays `null` (rendered "hours unknown"). Never guess.

### AI (Shravani)

`backend/ai/service.py`: `parse_request` (free text → `ParseResponse` via Gemini
structured output; nulls for unclear input) and `explain_route` (2–3 sentences
citing only numbers from the `RouteResponse`). Failures raise a clear error that
the API maps to `502` and must never block routing. Optional heat-check guidance
(`backend/ai/heatcheck.py`) uses fixed code rules for red flags, never the model.

### Frontend (Bhavisha)

Typed client `frontend/src/api.ts`, types `frontend/src/types.ts`. Mock mode
loads a copy of `docs/samples/route_response.sample.json` into `src/mocks/` when
`VITE_USE_MOCKS=true` and always shows a "SAMPLE DATA" badge. Screens:
`RouteForm.tsx`, `RouteMap.tsx` + `ComparisonCard.tsx`, `HelpNow.tsx`,
`AskBox.tsx`; preferences in `src/hooks/usePrefs.ts`. Only `VITE_API_URL` is
configured; no keys. Map shows OpenStreetMap attribution. Mobile-first at 390 px.

## Data flow

1. **Route:** form → `RouteRequest` → `POST /route` → `compute_routes` reads the
   snapped `shade_<HHMM>.json` → `RouteResponse` → map (grey/blue) + comparison.
2. **Plain English:** text → `POST /parse` → `ParseResponse` fills the form; after
   a result, optional `POST /explain` → explanation text under the comparison.
3. **Help now:** location → `GET /resources` → sorted list + map with open/closed/
   hours-unknown badges; tap routes to the resource.
4. **Preferences:** `Prefs` persisted to local storage, restored on reload.

## Honesty constraints in the design

- Routing returns computed numbers only (`source: "model"`); the UI renders only
  fields from the response.
- `open_now: null` → "hours unknown" everywhere; `last_checked` and `source_url`
  shown where present.
- Sample mode is visibly badged and never passed off as real; the API never
  emits `source: "sample"`.
- Heat-check red flags come from code, not the model; no medical advice.

## Contract gaps (record, do not change the contract)

These are places the requirements press against the fixed contract. Each is
handled within the current schema for the demo; changing the contract is out of
scope and would require the coordinated pull request described above.

1. **No explicit "snapped vs requested time" field.** The response carries both
   `depart_time` (echoed request) and `shade_layer` (the layer actually used), so
   the UI can show the basis of the estimate. No new field is needed; the UI
   derives the message from these two.
2. **"Avoid stairs" cannot always reach zero stairs.** `stairs_count` is reported
   per route, but if the only path to a destination includes `highway=steps`, the
   finder may still return a route with stairs. The contract has no "no route
   found" or "stairs unavoidable" signal. For the demo, the UI surfaces the
   returned `stairs_count` honestly rather than claiming a stairs-free route; a
   dedicated flag is a post-demo contract change.
3. **`/resources` has no explicit error-category field.** Unreadable hours are
   represented by `open_now: null` plus absent `last_checked`, which the UI maps
   to "hours unknown". No separate error field is added.
4. **`/explain` input is the full `RouteResponse`.** The explanation is
   constrained by prompt and review to cite only input numbers; the contract does
   not and will not enforce this field-by-field, so it is a behavioral constraint
   on the AI module, verified in that module's tests.

No contract gap in this list justifies editing `schemas.py` for the demo.

## Deployment

Web build and precomputed data on S3; API on Lambda + API Gateway if map data
loads fast enough, otherwise the API runs on the demo laptop (documented). The
APK runs from `https://localhost`, so the API must be reachable over HTTPS (API
Gateway or a tunnel); plain `http://<laptop-ip>:8000` is blocked as mixed
content. `VITE_API_URL` is set before building the frontend. APK is built with
Capacitor from `frontend/dist` (`cd mobile && npm run apk`); if the APK fails
late, ship the hosted web build as an installable page.
