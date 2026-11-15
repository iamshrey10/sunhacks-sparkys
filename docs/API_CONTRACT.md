# API contract

Source of truth in code: `backend/api/schemas.py`. Frontend mirror: `frontend/src/types.ts`.
Run the API and open http://localhost:8000/docs for the live, generated reference.

Base URL (dev): `http://localhost:8000`. JSON in, JSON out. Errors:
`501` module not implemented yet, `422` invalid input, `502` an upstream
service (Gemini, TinyFish) failed.

| Method | Path | Owner | Purpose |
|---|---|---|---|
| GET | `/health` | Shreyas | Liveness and which keys are configured |
| POST | `/route` | Rohan | Fastest and coolest routes |
| POST | `/directions` | Rohan | Turn-by-turn steps and places along a route |
| POST | `/track` | Rohan | Live position: progress, off-route, nearby places |
| GET | `/resources?lat&lng&radius_m` | Shreyas | Nearby water and cooling spots |
| POST | `/parse` | Shravani | Free text to settings |
| POST | `/explain` | Shravani | Short explanation of a route result |

## POST /route

Request:

```json
{
  "start": { "lat": 33.4166, "lng": -111.9340 },
  "end": { "lat": 33.4217, "lng": -111.9400 },
  "depart_time": "15:00",
  "prefs": { "avoid_stairs": true, "heat_sensitivity": "high", "shade_weight": 0.7 }
}
```

Response: `fastest` and `coolest`, each a `RouteOption`
(`kind`, `geometry` as `[lat, lng]` pairs, `distance_m`, `duration_s`, `shade_pct`
0-100, `sun_exposed_s`, `stairs_count`), plus `depart_time`, `shade_layer`
(which precomputed time was used) and `source: "model"`.
A full example for building UI is in `docs/samples/route_response.sample.json`.
It is illustrative sample data. Never show it as a real result.

## POST /directions

Request `{ "route": <RouteRequest>, "kind": "fastest" | "coolest" }` (default
`coolest`). Send the same `RouteRequest` you sent to `/route`: the steps are built
from the same path, so they match the line on the map. Response: `steps[]`,
`distance_m`, `duration_s`, `places[]` and `shade_layer`.

Each step (`DirectionStep`) has `instruction` ("Turn left onto East Tyler Mall"),
`maneuver` (`depart`, `continue`, `slight_left`, `slight_right`, `left`, `right`,
`sharp_left`, `sharp_right`, `u_turn`, `stairs`, `arrive`), `street` (null where
OpenStreetMap has no name), `location` (where the step begins), `start_along_m`,
`distance_m`, `duration_s`, `shade_pct` and `stairs`. The last step is always
`arrive`. Many paths are unnamed, so `street` is often null.

`places[]` are restaurants, cafes, bars and sights within about 75 m of the route,
in walking order (`NearbyPlace`, below).

## POST /track

Call every few seconds while walking. Request:

```json
{
  "geometry": [[33.4190, -111.9329], [33.4193, -111.9329]],
  "position": { "lat": 33.4191, "lng": -111.9329 },
  "last_progress_m": 12.4,
  "radius_m": 120
}
```

`geometry` is the route being walked (`RouteOption.geometry`), `position` is the GPS
fix, `last_progress_m` is `progress_m` from the previous response (optional, keeps
progress from jumping backwards or matching an earlier pass of a looping route),
`radius_m` is 20-500 (default 120). Nothing is stored between calls.

Response: `progress_m`, `remaining_m`, `remaining_s`, `distance_from_route_m`,
`off_route` (more than 35 m from the route: ask `/route` again from the current
position), `arrived` (within 20 m of the end), and `nearby[]`: up to 8 places
within `radius_m` of you, nearest first, each with `ahead` (its closest point on the
route is still in front of you).

## NearbyPlace

`id`, `name`, `group` (`food`, `cafe`, `drinks`, `sight`), `kind` (OpenStreetMap
value, e.g. `restaurant`), `location`, `listed_hours`, `source_url`, `distance_m`,
`along_route_m`, `ahead` (only in `/track`).

`listed_hours` is unverified OpenStreetMap text and most places have none. Never
show it as "open now". Show it as "listed hours" or leave it out.

## GET /resources

Returns `resources[]` (`id`, `name`, `kind`, `location`, `address`, `open_now`,
`hours_text`, `source_url`, `last_checked`, `distance_m`) and `generated_at`.
`open_now: null` means unknown, show "hours unknown".

## POST /parse

Request `{ "text": "3 PM, avoid stairs" }`. Response `depart_time` (or null),
`destination_text` (or null), `prefs`.

## POST /explain

Request `{ "route": <RouteResponse>, "prefs": <Prefs> }`. Response `{ "text": "..." }`.
