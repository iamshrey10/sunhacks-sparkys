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

from backend.routing.engine import EARTH_RADIUS_M, WALK_SPEED_MPS

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
    lat0 = geometry[0][0]
    k_lat = math.radians(1) * EARTH_RADIUS_M
    k_lng = k_lat * math.cos(math.radians(lat0))
    route = [(lng * k_lng, lat * k_lat) for lat, lng in geometry]
    cumulative = [0.0]
    for a, b in zip(route, route[1:]):
        cumulative.append(cumulative[-1] + math.dist(a, b))

    found = []
    for place in load_places():
        if groups and place["group"] not in groups:
            continue
        distance, along = _nearest_on_route(
            (place["lng"] * k_lng, place["lat"] * k_lat), route, cumulative
        )
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


def _nearest_on_route(point, route, cumulative) -> tuple[float, float]:
    """(distance to the route, distance along the route at the nearest point), metres."""
    px, py = point
    best_d2, best_along = math.inf, 0.0
    for i in range(len(route) - 1):
        (ax, ay), (bx, by) = route[i], route[i + 1]
        vx, vy = bx - ax, by - ay
        seg2 = vx * vx + vy * vy
        t = 0.0 if seg2 == 0 else min(1.0, max(0.0, ((px - ax) * vx + (py - ay) * vy) / seg2))
        d2 = (px - ax - t * vx) ** 2 + (py - ay - t * vy) ** 2
        if d2 < best_d2:
            best_d2, best_along = d2, cumulative[i] + t * math.sqrt(seg2)
    return math.sqrt(best_d2), best_along
