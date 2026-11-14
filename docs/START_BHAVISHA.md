# Bhavisha: start here

You own the whole frontend: what judges see and touch. It must look like a real product.
Time budget and full task list: `docs/tasks/bhavisha.md`. Do the steps below in order.

## A. Setup (15 minutes)

1. Accept the GitHub invitation: https://github.com/iamshrey10/sunhacks-sparkys/invitations
2. Install Git and Node 20 or newer (check with `node -v`).
3. In your coding tool, turn off co-author / attribution lines on commits and
   pull requests. Do this before your first commit.
4. Clone and switch to your branch:
   ```bash
   git clone https://github.com/iamshrey10/sunhacks-sparkys.git
   cd sunhacks-sparkys
   git checkout bhavisha
   git merge origin/main
   ```
5. Start the frontend:
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   npm run dev
   ```
   Open http://localhost:5173. You should see a map of ASU Tempe, the title
   "Cool Route", and "API: offline" (that is fine for now, the backend is optional
   until you reach task 3).
6. Tell your coding tool: "Read docs/ARCHITECTURE.md, docs/API_CONTRACT.md and
   docs/tasks/bhavisha.md. I only edit files inside frontend/."

You do not need the backend running to start. Build on sample data first.

## B. Your tasks, in order

**Task 1 (about 30 min): mock mode.**
- Copy `docs/samples/route_response.sample.json` into `frontend/src/mocks/`.
- In `frontend/.env.local` set `VITE_USE_MOCKS=true`.
- In `frontend/src/api.ts`, when that flag is on, make `api.route` return the sample.
- Show a visible **SAMPLE DATA** badge on screen whenever mock mode is on. Sample
  data must never look like a real result.
- Done when you can see route data on screen with the backend off.

**Task 2 (about 90 min): the route form.**
- File: `frontend/src/components/RouteForm.tsx`.
- Start and end points: a "use my location" button and tap-on-map to set each.
- Leave-at time picker (format `HH:MM`, default `15:00`).
- Preferences: avoid stairs (toggle), heat sensitivity (low / normal / high).
- Done when the form produces a valid `RouteRequest` (see `src/types.ts`).

**Task 3 (about 2 hours): two-route map.**
- Files: `frontend/src/components/RouteMap.tsx` and `ComparisonCard.tsx`.
- Draw the fastest route in grey and the coolest in blue (geometry is `[lat, lng]` pairs).
- A slider for `shade_weight` (0 to 1) that re-requests the route.
- A comparison card: extra minutes, shade %, sun-exposed minutes for each route.
- Done when it looks right on sample data. Switch to the real API when Rohan's `/route` works (about 6 PM).

**Task 4: Help now screen.** `frontend/src/components/HelpNow.tsx`. A big button, the
nearest water and cooling spots on the map and in a list, with badges "open now",
"closed" or **"hours unknown"** (when `open_now` is `null`; never guess). Use
`docs/samples/resources_response.sample.json` (copy it into `src/mocks/`, same
"SAMPLE DATA" badge rule) until Shreyas's `/resources` works.

**Task 5: plain-English box.** `frontend/src/components/AskBox.tsx`. The user types
"3 PM, avoid stairs"; call `api.parse`, fill the form, then show `api.explain` under
the comparison. If these return an error (501 or 502), the rest of the app must
still work.

**Task 6: polish.** Save preferences in `localStorage` (wrap in try/catch), add
loading, empty and error states, readable contrast in bright sunlight.

## C. Design rules

- Design for a phone, about 390 px wide. Big tap targets (at least 44 px).
- Cool colours, clear type, high contrast.
- Keep the OpenStreetMap attribution visible on the map.
- No API keys in the frontend. The only setting is `VITE_API_URL`.

## D. Saving your work

Run `npm run build` first; it must pass. Then, every 30 to 60 minutes:
```bash
git status
git add frontend
git commit -m "Short message about what changed"
git push -u origin bhavisha          # later pushes: git push
```
When a task is done, open a pull request:
```bash
gh pr create --base main --head bhavisha --title "Short summary" --body "What changed and how to test it"
```
Shreyas reviews and merges. Then run `git merge origin/main` on your branch.

## E. Rules

- Only edit files inside `frontend/`. Do not edit `backend/` or `src/types.ts`
  without asking Shreyas (the backend contract must match).
- Add files by name, not `git add .`. Never commit `.env.local`.
- Never run `git push --force` or `git reset --hard`.
- Stuck for more than 20 minutes? Message Shreyas.
