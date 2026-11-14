# Cool Route: Architecture

Read this first. It is the single source of truth for how the pieces fit.

**Pitch:** Google Maps finds the fastest way to walk. We find the coolest.

**What it is:** a mobile-first app (Android APK plus hosted web build) that finds the
lowest-sun walking route across ASU Tempe and Mill Ave, shows it next to the fastest
route, and finds the nearest open water or cooling spot ("Help now").

**Honest scope:** we estimate sun exposure from map data. We do not measure
temperature. We do not address indoor heat deaths or homelessness. The app is
aimed at pedestrians, older adults, students and outdoor workers.

## System

```
 Phone (Capacitor APK / browser)
   React + Leaflet UI  ──HTTPS──►  FastAPI  (backend/api)
                                     ├─ routing/   Rohan    route finder + shade scores
                                     ├─ resources/ Shreyas  water / cooling spots, live hours (TinyFish)
                                     └─ ai/        Shravani Gemini: parse request, explain route
   data/processed/*.json  ◄── built offline by backend/shade (Rohan)
```

Rules:
- The frontend talks only to the FastAPI backend. No API keys ship in the app.
- Gemini and TinyFish are called only from the backend, keys from `.env`.
- No database. Precomputed JSON in `data/processed/`, preferences in phone local storage.
- Times are local Tempe time (America/Phoenix, no daylight saving), format `HH:MM`.

## Modules and owners

| Module | Path | Owner | Branch |
|---|---|---|---|
| API shell, contract, integration, APK, deploy | `backend/api/`, `android/` | Shreyas | `shreyas` |
| Resources + live hours | `backend/resources/`, `data/resources/` | Shreyas | `shreyas` |
| Shade precompute | `backend/shade/` | Rohan | `rohan` |
| Route finder | `backend/routing/` | Rohan | `rohan` |
| Frontend | `frontend/` | Bhavisha | `bhavisha` |
| Gemini parse + explain | `backend/ai/` | Shravani | `shravani` |

Only edit files in your own module. If you need a contract change, open a pull
request that edits `backend/api/schemas.py`, `frontend/src/types.ts` and
`docs/API_CONTRACT.md` together, and tell Shreyas.

## Shade model (Rohan)

1. Download the walking network and building footprints for the demo area
   (ASU Tempe campus + Mill Ave, about 2 km x 2 km) from OpenStreetMap with OSMnx.
2. For each of four times of day (09:00, 12:00, 15:00, 18:00) compute the sun
   position with pvlib and project building shadows with Shapely.
3. For each path segment, sample points along it and compute the shaded share from
   building shadows, tree canopy (OSM tags), and covered walkways (OSM `covered`
   / `tunnel=building_passage` plus a hand-labelled list for the demo corridor).
4. Write `data/processed/shade_<HHMM>.json`: segment id to shade fraction 0-1.
5. Route cost per segment = `length * (1 + shade_weight * sun_fraction * k)` where
   `k` rises with `heat_sensitivity`. Fastest route uses `length` only.
   Steps (OSM `highway=steps`) are excluded when `avoid_stairs` is true.
6. Requests for other times snap to the nearest precomputed layer.

Fallback if the sun-projection is not working by 4:30 PM: estimate shade from
building height and tree density per segment. Say so in the README.

## Resources and live hours (Shreyas)

- Base list: OpenStreetMap `amenity=drinking_water`, libraries, and a small
  hand-verified list of cooling centers in `data/resources/curated.json`.
- TinyFish reads the official hours pages and the result is cached with
  `last_checked`. If a source cannot be read, `open_now` stays `null` and the
  UI shows "hours unknown". Never guess.

## Gemini (Shravani)

- `parse_request`: free text ("3 PM, avoid stairs, I get overheated easily") to
  `ParseResponse` using a strict response schema.
- `explain_route`: a short, honest explanation of the chosen route from the
  numbers in `RouteResponse`. It may only cite numbers present in the input.
- A failure must never block routing. The UI works without either call.

## Deploy

- Web build and precomputed data on S3. API on Lambda + API Gateway if the map
  data loads fast enough, otherwise run the API on the demo laptop and say so.
- APK built with Capacitor from `frontend/dist`. If the APK fails late, ship the
  hosted web build as an installable page.
