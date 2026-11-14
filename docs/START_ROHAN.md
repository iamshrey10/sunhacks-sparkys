# Rohan: start here

You own the shade model and route finder. It is the heart of the product.
Time budget and full task list: `docs/tasks/rohan.md`. Do the steps below in order.

## A. Setup (15 minutes)

1. Accept the GitHub invitation: https://github.com/iamshrey10/sunhacks-sparkys/invitations
2. Install Git, and Python 3.12 (check with `python3.12 --version`).
3. In your coding tool, turn off co-author / attribution lines on commits and
   pull requests. Do this before your first commit.
4. Clone and switch to your branch:
   ```bash
   git clone https://github.com/iamshrey10/sunhacks-sparkys.git
   cd sunhacks-sparkys
   git checkout rohan
   git merge origin/main
   ```
5. Create the environment and install everything:
   ```bash
   python3.12 -m venv .venv
   source .venv/bin/activate            # Windows: .venv\Scripts\activate
   pip install -r backend/requirements-geo.txt
   cp .env.example .env
   ```
   If the install fails, copy the error and send it to Shreyas.
6. Check it works:
   ```bash
   pytest backend/tests                 # expect: 3 passed
   uvicorn backend.api.main:app --reload --port 8000
   ```
   Open http://localhost:8000/health. It should show `"status":"ok"`.
7. Tell your coding tool: "Read docs/ARCHITECTURE.md and docs/tasks/rohan.md.
   I only edit backend/shade/, backend/routing/ and data/processed/."

## B. Your tasks, in order

**Task 1 (by about 2:00 PM): download the map.**
Create `backend/shade/fetch_osm.py`.
- Area: about 2 km x 2 km around ASU Tempe and Mill Ave, centre 33.4194, -111.9341.
- Get the walking network and building footprints with OSMnx.
- Save raw files to `data/raw/` (already gitignored, never commit them).
- Print node, edge and building counts.
- Done when the script runs and prints the counts.

**Task 2 (by about 3:30 PM): building shadows.**
Create `backend/shade/build_shade.py`.
- Sun position with pvlib for a mid-July date at 09:00, 12:00, 15:00, 18:00 (America/Phoenix).
- Project each building's shadow with Shapely. Use OSM `height`, or `building:levels` x 3 m, with a documented default.
- Done when you can plot shadows for one time and they look plausible on the map.

**Task 3 (by about 4:30 PM): shade per street segment.**
- Combine shadows + trees (OSM `natural=tree`) + covered walkways.
- Hand-label covered walkways on the demo corridor in `backend/shade/covered.json`.
- Write `data/processed/shade_0900.json`, `shade_1200.json`, `shade_1500.json`, `shade_1800.json` (segment id to a 0-1 shade fraction). Keep them small.
- Done when values look sensible (shaded streets high, open plazas low).
- **If this is not working by 4:30 PM, tell Shreyas.** The fallback (estimate from building height and tree density) is in `docs/ARCHITECTURE.md`.

**Task 4 (by about 6:00 PM): route finder.**
Fill in `compute_routes()` in `backend/routing/engine.py`. Do not change its signature.
- Fastest route: cost is length only.
- Coolest route: cost is `length * (1 + shade_weight * sun_fraction * k)`, with `k` larger for higher `heat_sensitivity`.
- Skip steps (`highway=steps`) when `avoid_stairs` is true.
- Snap `depart_time` to the nearest of your four layers.
- Test: Student Pavilion (33.4190, -111.9330) to Mill Ave and University (33.4217, -111.9400).
- Done when `POST /route` at http://localhost:8000/docs returns two different routes and the coolest has the higher `shade_pct`.

**Task 5:** tests in `backend/tests/test_routing.py`. Done when `pytest backend/tests` passes.

Return only real computed numbers. Never hand-write a route into the API output.

## C. Saving your work

Every 30 to 60 minutes:
```bash
git status
git add backend/shade backend/routing data/processed backend/tests
git commit -m "Short message about what changed"
git push -u origin rohan             # later pushes: git push
```
When a task is done, open a pull request:
```bash
gh pr create --base main --head rohan --title "Short summary" --body "What changed and how to test it"
```
Shreyas reviews and merges. Then run `git merge origin/main` on your branch.

## D. Rules

- Only edit your own folders. Do not edit `backend/api/schemas.py` without asking Shreyas.
- Add files by name, not `git add .`. Never commit `.env` or `data/raw/`.
- Never run `git push --force` or `git reset --hard`.
- Stuck for more than 20 minutes? Message Shreyas.
