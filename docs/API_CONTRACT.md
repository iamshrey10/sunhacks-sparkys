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

## GET /resources

Returns `resources[]` (`id`, `name`, `kind`, `location`, `address`, `open_now`,
`hours_text`, `source_url`, `last_checked`, `distance_m`) and `generated_at`.
`open_now: null` means unknown, show "hours unknown".

## POST /parse

Request `{ "text": "3 PM, avoid stairs" }`. Response `depart_time` (or null),
`destination_text` (or null), `prefs`.

## POST /explain

Request `{ "route": <RouteResponse>, "prefs": <Prefs> }`. Response `{ "text": "..." }`.
