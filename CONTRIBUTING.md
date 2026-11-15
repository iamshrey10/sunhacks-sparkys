# Contributing

One repo, one branch per person, pull requests into `main`.
`main` is protected: nobody pushes to it directly.

Branches: `shreyas`, `rohan`, `bhavisha`, `shravani`.
Read `docs/ARCHITECTURE.md` first.

## One-time setup (everyone)

Accept the GitHub invitation first: https://github.com/iamshrey10/sunhacks-sparkys/invitations

Requirements: Git, Node 20+, Python 3.12.

```bash
git clone https://github.com/iamshrey10/sunhacks-sparkys.git
cd sunhacks-sparkys
git checkout <your-branch>            # shreyas | rohan | bhavisha | shravani
git merge origin/main                 # pick up the latest shared code

# backend (from the repo root)
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp .env.example .env                  # then fill in YOUR OWN keys. Never commit .env.
uvicorn backend.api.main:app --reload --port 8000

# frontend (second terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev                           # http://localhost:5173
```

Rohan also runs `pip install -r backend/requirements-geo.txt`.

Check it works: `pytest backend/tests` passes, and http://localhost:8000/health returns ok.

## Daily loop

```bash
git status                            # look before you add
git add path/to/your/files            # add your files by name, not git add .
git commit -m "Short, specific message about what changed"
git push -u origin <your-branch>      # first push; later just: git push
```

Commit every 30-60 minutes and push at least hourly, so nothing is lost.
Do not add co-author trailers or "generated with" lines to commits or pull requests.

## Staying up to date

```bash
git fetch origin
git merge origin/main
```

Resolve conflicts if any, run the app and tests, then push.
Never use `git push --force` or `git reset --hard`. Ask Shreyas first.

## Opening a pull request

```bash
gh pr create --base main --head <your-branch> \
  --title "Short summary" --body "What changed and how to test it"
```

Or use the "Compare & pull request" button on GitHub. Keep each pull request
inside your own module so it merges cleanly. After it is merged, run
`git merge origin/main` on your branch and keep going.

## Reviewing and merging (Shreyas)

```bash
gh pr list
gh pr diff <number>                   # read the change
gh pr checkout <number>               # run it locally if needed
gh pr merge <number> --merge          # merge commit, keeps history
```

Merge checklist: app starts, `pytest backend/tests` passes, `npm run build` in
`frontend/` passes, no `.env` or keys in the diff, only the owner's module touched.

## Secrets

Keys live only in your local `.env`. Gemini and TinyFish keys are called only
from the backend. If a key is ever committed, tell Shreyas immediately so it can
be rotated. Deleting the commit is not enough.
