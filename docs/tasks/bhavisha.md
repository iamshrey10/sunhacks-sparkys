# Bhavisha: frontend

Branch: `bhavisha`. Read `docs/ARCHITECTURE.md` and `docs/API_CONTRACT.md` first.

Files you own: everything under `frontend/`. Do not edit `backend/`.
Stack: Vite, React, TypeScript, Tailwind, Leaflet (react-leaflet). Already set up and building.
Typed client: `frontend/src/api.ts`. Types: `frontend/src/types.ts`.

## Design goals

Mobile first (design at 390 px wide). Looks like a real product: clear type, high
contrast outdoors in sunlight, big tap targets, cool-toned palette. Short loading
states. Every error has a human message.

## Tasks

| # | Task | Output | Depends on | Done when | Est. |
|---|---|---|---|---|---|
| 1 | Mock mode: load `docs/samples/route_response.sample.json` copy into `src/mocks/` when `VITE_USE_MOCKS=true`. Show a visible "SAMPLE DATA" badge whenever mocks are on. | `src/mocks/`, small switch in `src/api.ts` | none | UI develops with the real API off, and sample data is always labelled | 30 min |
| 2 | Route screen: start/end inputs (current location button, tap-on-map to set), leave-at time picker, preferences (avoid stairs, heat sensitivity). | `src/components/RouteForm.tsx` | none | Form produces a valid `RouteRequest` | 90 min |
| 3 | Two-route map view: fastest (grey) vs coolest (blue), a shade-weight slider that re-requests, and a comparison card (extra minutes, shade %, sun-exposed minutes). | `src/components/RouteMap.tsx`, `ComparisonCard.tsx` | 1 | Looks right on sample data, then on the real `/route` | 120 min |
| 4 | Help now screen: big button, nearest resources on the map and list, "open now / closed / hours unknown" badges, tap for walking route. | `src/components/HelpNow.tsx` | `/resources` (Shreyas) | Works on mock then real data | 90 min |
| 5 | Plain-English box: user types a request, call `/parse`, fill the form, show `/explain` text under the comparison. UI works if these return 501 or fail. | `src/components/AskBox.tsx` | `/parse`, `/explain` (Shravani) | Graceful when unavailable | 60 min |
| 6 | Saved preferences in `localStorage` (wrap in try/catch). Loading, empty and error states. Basic accessibility (labels, contrast). | `src/hooks/usePrefs.ts` | 2 | Reload keeps preferences | 45 min |

Milestones: clickable UI on sample data by 4:30 PM, real API connected by 6:00 PM.

## Rules

- Never present sample data as real. Never hide `open_now: null`; show "hours unknown".
- No API keys in the frontend. Only `VITE_API_URL`.
- Run `npm run build` before every pull request.
- Include the OpenStreetMap attribution on the map.
