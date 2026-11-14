"""Download drinking water and libraries near ASU Tempe from OpenStreetMap.

Run from the repo root:  python scripts/fetch_osm_resources.py
Writes data/resources/osm_resources.json. Data (c) OpenStreetMap contributors (ODbL).
The public Overpass server is sometimes busy; the script retries with backoff.
"""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

CENTER = (33.4194, -111.9341)  # ASU Tempe campus
RADIUS_M = 2500
SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
OUT = Path(__file__).resolve().parents[1] / "data" / "resources" / "osm_resources.json"

QUERY = f"""[out:json][timeout:40];
(
  node(around:{RADIUS_M},{CENTER[0]},{CENTER[1]})["amenity"="drinking_water"];
  nwr(around:{RADIUS_M},{CENTER[0]},{CENTER[1]})["amenity"="library"];
);
out center tags;"""


def fetch() -> dict:
    delay = 5
    for attempt in range(4):
        for url in SERVERS:
            try:
                r = httpx.post(
                    url,
                    data={"data": QUERY},
                    headers={"User-Agent": "sunhacks-coolroute/0.1"},
                    timeout=60,
                )
                if r.status_code == 200 and r.text.lstrip().startswith("{"):
                    return r.json()
            except httpx.HTTPError:
                pass
        time.sleep(delay)
        delay *= 2
    sys.exit("Overpass unavailable; try again in a few minutes.")


def main() -> None:
    raw = fetch()
    elements = []
    for e in raw["elements"]:
        lat = e.get("lat") or e.get("center", {}).get("lat")
        lng = e.get("lon") or e.get("center", {}).get("lon")
        if lat is None or lng is None:
            continue
        tags = e.get("tags", {})
        elements.append(
            {
                "type": e["type"],
                "id": e["id"],
                "amenity": tags.get("amenity"),
                "name": tags.get("name"),
                "opening_hours": tags.get("opening_hours"),
                "lat": lat,
                "lng": lng,
            }
        )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "attribution": "(c) OpenStreetMap contributors, ODbL",
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "elements": elements,
            },
            indent=1,
        )
    )
    print(f"wrote {len(elements)} elements to {OUT}")


if __name__ == "__main__":
    main()
