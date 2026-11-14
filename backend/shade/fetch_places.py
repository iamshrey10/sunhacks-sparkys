"""Download places worth stopping at from OpenStreetMap. Owner: Rohan.

Restaurants, cafes, bars and sights in the demo area, for "what is along my
walk". Writes data/processed/places.json, which backend/routing/places.py reads.

Only named places are kept. Opening hours are copied from OpenStreetMap as text
and are NOT verified: show them as "listed hours", never as "open now".

Run from the repo root:
    python -m backend.shade.fetch_places
"""

import json
import math
from datetime import datetime, timezone
from pathlib import Path

import osmnx as ox

from backend.shade.fetch_osm import CENTER, DIST_M, RAW_DIR

PLACES_PATH = Path(__file__).resolve().parents[2] / "data" / "processed" / "places.json"

# OSM tag -> value -> the group shown to the user.
GROUPS = {
    "amenity": {
        "restaurant": "food", "fast_food": "food", "food_court": "food",
        "cafe": "cafe", "ice_cream": "cafe",
        "bar": "drinks", "pub": "drinks",
    },
    "tourism": {
        "attraction": "sight", "museum": "sight", "gallery": "sight",
        "artwork": "sight", "viewpoint": "sight",
    },
    "historic": {},  # any value counts as a sight
}
EXTRA_FIELDS = ["cuisine", "website", "opening_hours"]


def _text(value) -> str | None:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    return str(value)


def _classify(row) -> tuple[str, str] | None:
    """(group, kind) for a feature, or None if it is not a place we list."""
    for tag, values in GROUPS.items():
        value = _text(row.get(tag))
        if value is None:
            continue
        if tag == "historic":
            return "sight", f"historic:{value}"
        if value in values:
            return values[value], value
    return None


def fetch_places() -> list[dict]:
    tags = {tag: (list(values) or True) for tag, values in GROUPS.items()}
    features = ox.features_from_point(CENTER, tags=tags, dist=DIST_M)
    places = []
    for (element, osm_id), row in features.iterrows():
        name = _text(row.get("name"))
        classified = _classify(row)
        if not name or not classified:
            continue
        point = row.geometry.representative_point()
        place = {
            "id": f"{element}/{osm_id}",
            "name": name,
            "group": classified[0],
            "kind": classified[1],
            "lat": round(point.y, 6),
            "lng": round(point.x, 6),
            "source_url": f"https://www.openstreetmap.org/{element}/{osm_id}",
        }
        for field in EXTRA_FIELDS:
            place[field] = _text(row.get(field))
        places.append(place)
    return sorted(places, key=lambda p: (p["group"], p["name"], p["id"]))


def main() -> None:
    ox.settings.cache_folder = str(RAW_DIR / "cache")
    places = fetch_places()
    PLACES_PATH.parent.mkdir(parents=True, exist_ok=True)
    PLACES_PATH.write_text(json.dumps({
        "attribution": "(c) OpenStreetMap contributors, ODbL",
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "note": "opening_hours is unverified OpenStreetMap text",
        "places": places,
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    counts: dict[str, int] = {}
    for place in places:
        counts[place["group"]] = counts.get(place["group"], 0) + 1
    for group, count in sorted(counts.items()):
        print(f"{group + ':':8} {count}")
    print(f"total:   {len(places)} -> {PLACES_PATH}")


if __name__ == "__main__":
    main()
