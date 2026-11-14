# Cool Route

**Google Maps finds the fastest way to walk. We find the coolest.**

Built by Sparky's (Shreyas, Rohan, Shravani, Bhavisha) at SunHacks 2026, Arizona State University.

Cool Route is a mobile-first app that finds the lowest-sun walking route across
ASU Tempe and Mill Ave, shows it next to the fastest route, and finds the nearest
open water or cooling spot.

## Problem

Extreme heat is a leading public-health risk in the Phoenix area, and most
navigation apps default to the shortest route and ignore shade. Heat deaths
happen mostly outdoors.

## Scope and honesty

We estimate sun exposure from map data (building shadows, trees, covered
walkways). We do not measure temperature. Cool Route does not address indoor
heat deaths or homelessness. It is aimed at pedestrians, older adults, students
and outdoor workers.

## Status

Under active development. Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
API: [docs/API_CONTRACT.md](docs/API_CONTRACT.md). Team workflow: [CONTRIBUTING.md](CONTRIBUTING.md).

## Run locally

Requirements: Python 3.12, Node 20+.

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
cp .env.example .env            # add your own keys
uvicorn backend.api.main:app --reload --port 8000

cd frontend && npm install && cp .env.example .env.local && npm run dev
```

Full README (screenshots, demo, team contributions) comes with the submission.
