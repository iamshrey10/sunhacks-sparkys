"""Re-check the curated resource listings against their source pages with TinyFish.

Run from the repo root (needs TINYFISH_API_KEY in .env):
    python scripts/refresh_resources.py

For each site, the page text must still contain the listing we recorded. If it
does, last_checked is updated. If it does not (or the page cannot be read), the
site is marked stale, so the API reports open_now as unknown instead of guessing.
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.resources.tinyfish import TinyFishError, fetch_text  # noqa: E402

CURATED = Path(__file__).resolve().parents[1] / "data" / "resources" / "curated.json"


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("*", "")).strip()


def main() -> None:
    doc = json.loads(CURATED.read_text())
    pages: dict[str, str | None] = {}
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for site in doc["sites"]:
        url = site["source_url"]
        if url not in pages:
            try:
                pages[url] = norm(fetch_text(url))
            except TinyFishError as exc:
                print(f"! could not read {url}: {exc}")
                pages[url] = None
        page = pages[url]
        ok = page is not None and norm(site["snippet"]) in page
        site["stale"] = not ok
        if ok:
            site["last_checked"] = now
        print(f"{'ok   ' if ok else 'STALE'} {site['name']}")
    CURATED.write_text(json.dumps(doc, indent=1))


if __name__ == "__main__":
    main()
