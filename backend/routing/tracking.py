"""Live position along a route. Owner: Rohan.

Stateless: the phone sends the route geometry and its current GPS position every
few seconds; this says how far along you are, how far is left, whether you have
left the route, and which restaurants, cafes and sights are around you.

    update = track(route.geometry, (lat, lng), last_progress_m=previous.progress_m)

Not wired into the API yet: that needs the models in backend/api/schemas.py.
"""

import math
from dataclasses import dataclass

from backend.routing.engine import WALK_SPEED_MPS
from backend.routing.geo import Frame, cumulative_lengths, nearest_on_polyline
from backend.routing.places import load_places

# More than this from the route and the walker should ask for a new route.
OFF_ROUTE_M = 35.0
# Within this of the end counts as arrived.
ARRIVED_M = 20.0
# Going back along the route by more than this is treated as GPS jitter and ignored.
BACKTRACK_M = 25.0
DEFAULT_RADIUS_M = 120.0
MAX_NEARBY = 8


@dataclass
class NearbyPlace:
    place: dict  # the stored place from places.json
    distance_m: float  # from the walker
    along_route_m: float  # where on the route the place is closest
    ahead: bool  # that point is still in front of the walker


@dataclass
class Tracking:
    progress_m: float
    remaining_m: float
    remaining_s: float
    distance_from_route_m: float
    off_route: bool
    arrived: bool
    nearby: list[NearbyPlace]


def track(
    geometry: list[tuple[float, float]],
    position: tuple[float, float],
    last_progress_m: float | None = None,
    radius_m: float = DEFAULT_RADIUS_M,
) -> Tracking:
    """Where the walker is on the route.

    geometry:        route [lat, lng] pairs in walking order (at least two).
    position:        current (lat, lng).
    last_progress_m: progress from the previous call. Keeps a route that doubles
                     back from matching the earlier pass, and stops the progress
                     bar jumping backwards on GPS noise.
    """
    if len(geometry) < 2:
        raise ValueError("a route needs at least two points")

    frame = Frame(geometry[0][0])
    route = [frame.xy(lat, lng) for lat, lng in geometry]
    cumulative = cumulative_lengths(route)
    total = cumulative[-1]

    floor = max(0.0, last_progress_m - BACKTRACK_M) if last_progress_m is not None else 0.0
    distance, progress = nearest_on_polyline(frame.xy(*position), route, cumulative, floor)
    if last_progress_m is not None:
        progress = max(progress, last_progress_m)
    progress = min(progress, total)
    remaining = total - progress

    # Arrived means within ARRIVED_M of the destination in a straight line, which can
    # be a little before the last metres of path are walked.
    to_end = math.dist(frame.xy(*position), route[-1])
    arrived = to_end <= ARRIVED_M

    return Tracking(
        progress_m=round(progress, 1),
        remaining_m=round(remaining, 1),
        remaining_s=round(remaining / WALK_SPEED_MPS, 1),
        distance_from_route_m=round(distance, 1),
        off_route=distance > OFF_ROUTE_M and not arrived,
        arrived=arrived,
        nearby=_nearby(frame, route, cumulative, position, progress, radius_m),
    )


def _nearby(frame, route, cumulative, position, progress, radius_m) -> list[NearbyPlace]:
    here = frame.xy(*position)
    found: list[NearbyPlace] = []
    for place in load_places():
        spot = frame.xy(place["lat"], place["lng"])
        distance = math.dist(here, spot)
        if distance > radius_m:
            continue
        _off, along = nearest_on_polyline(spot, route, cumulative)
        found.append(NearbyPlace(place, round(distance, 1), round(along, 1), along >= progress))

    # OpenStreetMap can map one place in pieces (Palm Walk): keep the closest piece.
    found.sort(key=lambda n: n.distance_m)
    seen: set[tuple[str, str]] = set()
    unique = []
    for item in found:
        key = (item.place["group"], item.place["name"])
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique[:MAX_NEARBY]
