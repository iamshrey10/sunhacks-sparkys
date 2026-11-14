# Prompt for Kiro (spec-driven planning)

Open the repo folder in Kiro, start a new spec, and paste the block below.
Do not paste any API keys. Review the generated `requirements.md`, `design.md`
and `tasks.md` against `docs/ARCHITECTURE.md` and `docs/API_CONTRACT.md`;
the docs win on any conflict.

```
Create a spec for "Cool Route", a mobile-first app (Android APK via Capacitor plus a
hosted web build) that finds the lowest-sun walking route across ASU Tempe and
Mill Ave and shows it next to the fastest route, with a "Help now" screen for the
nearest open water or cooling spot. Deadline: working demo in under 8 hours, four
developers, one module each.

Read these first and treat them as the source of truth:
- docs/ARCHITECTURE.md
- docs/API_CONTRACT.md
- backend/api/schemas.py
- docs/tasks/*.md

Stack: Vite + React + TypeScript + Tailwind + Leaflet; FastAPI on Python 3.12;
OSMnx/NetworkX/Shapely/pvlib for shade and routing; Gemini (backend only) for
request parsing and route explanation; TinyFish (backend only) for live opening
hours; AWS S3 plus Lambda/API Gateway for hosting. No database, no sign-in.

Requirements to produce:
1. User stories with acceptance criteria for: coolest vs fastest route, avoid
   stairs, leave-at time, plain-English request, Help now, saved preferences.
2. A design that keeps the four modules independent and uses only the existing
   API contract. Call out any contract gap instead of changing the contract.
3. Honesty constraints: shade is an estimate from map data, unknown hours show as
   "hours unknown", sample data is always labelled, no medical advice.
4. Tasks ordered by dependency, each mapped to an owner and file path from
   docs/tasks/, with a definition of done. Mark the critical path (shade model).
5. Risks with fallbacks: shade math too slow, TinyFish page unreadable, Gemini
   rate limit, APK build failure, API reachable only over HTTPS from the APK.

Do not add features beyond the list above. Do not generate application code yet.
```
