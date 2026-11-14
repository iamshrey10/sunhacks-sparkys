# Rohan: shade model and route finder

Branch: `rohan`. Read `docs/ARCHITECTURE.md` (Shade model) first.
This is the hardest module and the heart of the product. Everyone's demo depends on it.

Files you own: `backend/shade/`, `backend/routing/`, `data/processed/`, `backend/requirements-geo.txt`.
Do not edit other modules. Install extras: `pip install -r backend/requirements-geo.txt`.

## Tasks

| # | Task | Output | Depends on | Done when | Est. |
|---|---|---|---|---|---|
| 1 | Download the demo-area walking graph and building footprints (ASU Tempe + Mill Ave, ~2 km x 2 km). Cache raw files in `data/raw/` (gitignored). | `backend/shade/fetch_osm.py` | none | Script runs and prints node/edge/building counts | 45 min |
| 2 | Shadow projection with pvlib + Shapely for 09:00, 12:00, 15:00, 18:00 on a mid-July date. Use OSM `height` or `building:levels` (x3 m), with a documented default. | `backend/shade/build_shade.py` | 1 | Shadow polygons plotted for one time look plausible against the map | 90 min |
| 3 | Per-segment shade fraction: shadows + tree points (OSM `natural=tree`) + covered walkways. Hand-label the demo corridor covered walkways in `backend/shade/covered.json`. | `data/processed/shade_<HHMM>.json` (segment id to 0-1) | 2 | Four files exist, values vary sensibly (shaded streets high, open plazas low) | 90 min |
| 4 | Route finder: Dijkstra/A* with cost `length * (1 + shade_weight * sun_fraction * k)`, `k` by `heat_sensitivity`. Fastest uses `length`. Exclude `highway=steps` when `avoid_stairs`. Snap `depart_time` to the nearest layer. | `compute_routes()` in `backend/routing/engine.py` | 3 | `POST /route` returns two different routes for Student Pavilion to Mill Ave; coolest has higher `shade_pct` | 90 min |
| 5 | Tests: a few route cases with known expectations. | `backend/tests/test_routing.py` | 4 | `pytest backend/tests` passes | 30 min |

Milestones: first shade file by 4:30 PM, `/route` working by 6:00 PM.

## Rules

- Signature of `compute_routes(req: RouteRequest) -> RouteResponse` must not change.
- Report real numbers only. No hand-written routes in the API output.
- If sun projection is not working by 4:30 PM, switch to the fallback in the architecture doc and tell Shreyas.
- Keep the processed files small (a few MB at most).
