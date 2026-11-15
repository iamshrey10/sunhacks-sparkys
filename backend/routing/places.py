"""Places along a route. Owner: Rohan.

Given a route's geometry (the `geometry` of a RouteOption), lists the named
restaurants, cafes, bars and sights close to it, in the order you walk past
them. Data: data/processed/places.json, built by backend/shade/fetch_places.py
from OpenStreetMap.

This is not wired into the API yet: there is no endpoint or schema for it.
`opening_hours` is unverified OpenStreetMap text, so never show it as "open now".
"""

import json
import math
from functools import lru_cache
from pathlib import Path

from backend.routing.engine import WALK_SPEED_MPS
from backend.routing.geo import Frame, cumulative_lengths, nearest_on_polyline

PLACES_PATH = Path(__file__).resolve().parents[2] / "data" / "processed" / "places.json"

GROUPS = ("food", "cafe", "drinks", "sight")
DEFAULT_MAX_DISTANCE_M = 75.0


@lru_cache
def load_places() -> tuple[dict, ...]:
    if not PLACES_PATH.exists():
        raise NotImplementedError("Places not built yet: run backend/shade/fetch_places.py")
    return tuple(json.loads(PLACES_PATH.read_text(encoding="utf-8"))["places"])


def places_along(
    geometry: list[tuple[float, float]],
    max_distance_m: float = DEFAULT_MAX_DISTANCE_M,
    groups: tuple[str, ...] | None = None,
    limit: int | None = None,
) -> list[dict]:
    """Places within `max_distance_m` of the route, in walking order.

    geometry: [lat, lng] pairs in walking order.
    groups:   keep only these groups (see GROUPS); None keeps all.
    limit:    keep only the `limit` places closest to the route.

    Each result is the stored place plus:
        distance_from_route_m  straight-line detour from the nearest point of the route
        along_route_m          how far into the walk that nearest point is
        walk_from_start_s      walking time to reach that point
    """
    if len(geometry) < 2:
        return []
    frame = Frame(geometry[0][0])
    route = [frame.xy(lat, lng) for lat, lng in geometry]
    cumulative = cumulative_lengths(route)

    found = []
    for place in load_places():
        if groups and place["group"] not in groups:
            continue
        distance, along = nearest_on_polyline(frame.xy(place["lat"], place["lng"]), route, cumulative)
        if distance <= max_distance_m:
            found.append({
                **place,
                "distance_from_route_m": round(distance, 1),
                "along_route_m": round(along, 1),
                "walk_from_start_s": round(along / WALK_SPEED_MPS, 1),
            })

    # OpenStreetMap can hold one place as several features (Palm Walk is mapped
    # in pieces): keep the piece closest to the route.
    found.sort(key=lambda p: p["distance_from_route_m"])
    closest: dict[tuple[str, str], dict] = {}
    for place in found:
        closest.setdefault((place["group"], place["name"]), place)
    found = list(closest.values())

    if limit is not None:
        found = found[:limit]
    return sorted(found, key=lambda p: (p["along_route_m"], p["distance_from_route_m"]))

