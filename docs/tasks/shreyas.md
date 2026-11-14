# Shreyas: API, resources, integration, APK, deploy

Branch: `shreyas`. Team lead.

Files you own: `backend/api/`, `backend/resources/`, `data/resources/`, `mobile/`, `docs/`, `scripts/`.

## Tasks

| # | Task | Output | Depends on | Done when | Est. |
|---|---|---|---|---|---|
| 1 | Merge the skeleton pull request; everyone pulls `main` | `main` has the skeleton | none | Teammates can run backend + frontend | 15 min |
| 2 | Run the architecture spec in Kiro from `docs/ARCHITECTURE.md`; keep specs in `.kiro/` | `.kiro/specs/` | 1 | Spec matches this doc, gaps noted | 45 min |
| 3 | One real TinyFish call (Fetch or Search) with your own key; record request/response shape | `backend/resources/tinyfish.py` | key in `.env` | Returns real content for one cooling-center page | 45 min |
| 4 | Resource base list: OSM drinking water + libraries near the demo area, plus a hand-verified cooling-center list with source URLs | `data/resources/curated.json` | none | At least 10 verified resources, each with `source_url` | 60 min |
| 5 | `get_resources()` with distance sorting and live hours from TinyFish (`last_checked`, `null` when unknown) | `backend/resources/service.py` | 3, 4 | `GET /resources` returns real data for Memorial Union | 90 min |
| 6 | Capacitor APK: install Capacitor 6, already set up in `mobile/`. Run `cd mobile && npm run apk`, install `mobile/android/app/build/outputs/apk/debug/app-debug.apk` on a real phone via `adb install`. First build is done; retest after each frontend milestone. | `mobile/` | frontend builds | APK installs, opens, reaches the API | 90 min |
| 7 | Integration, bug fixing, feature freeze at 8:00 PM | working app | everyone | Full flow works on the phone | ongoing |
| 8 | AWS: budget alarm at $20, S3 for web build + data, try Lambda + API Gateway; fall back to running the API on the laptop | deployed URL or documented fallback | 7 | Demo URL works, or fallback is documented | 90 min |
| 9 | README, screenshots, demo script | `README.md` | 7 | Matches what actually works | 60 min |

## Rules

- Review every pull request before merging (see `CONTRIBUTING.md`).
- Keep keys in `.env`. Do not paste keys into specs, prompts or docs.
- Feature freeze at 8:00 PM. Submit by 9:45 PM.
