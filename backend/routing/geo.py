"""Small flat-earth geometry helpers for city-scale walking routes. Owner: Rohan.

Points are (lat, lng) degrees. Distances are metres. At 2 km scale the flat
approximation is off by well under a metre, which is fine for walking.
"""

import math

EARTH_RADIUS_M = 6_371_000.0
CARDINALS = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"]


class Frame:
    """Local x (east) / y (north) metres around an origin latitude."""

    def __init__(self, origin_lat: float) -> None:
        self.k_lat = math.radians(1) * EARTH_RADIUS_M
        self.k_lng = self.k_lat * math.cos(math.radians(origin_lat))

    def xy(self, lat: float, lng: float) -> tuple[float, float]:
        return lng * self.k_lng, lat * self.k_lat


def cumulative_lengths(xy: list[tuple[float, float]]) -> list[float]:
    """Distance along the polyline at each vertex, starting at 0."""
    out = [0.0]
    for a, b in zip(xy, xy[1:]):
        out.append(out[-1] + math.dist(a, b))
    return out


def nearest_on_polyline(
    point: tuple[float, float],
    xy: list[tuple[float, float]],
    cumulative: list[float],
    min_along_m: float = 0.0,
) -> tuple[float, float]:
    """(distance to the polyline, distance along it at the nearest point).

    Only parts of the polyline that end at or after `min_along_m` are considered,
    so a walker on a route that doubles back is not matched to the earlier pass.
    """
    px, py = point
    best_d2, best_along = math.inf, 0.0
    for i in range(len(xy) - 1):
        if cumulative[i + 1] < min_along_m:
            continue
        (ax, ay), (bx, by) = xy[i], xy[i + 1]
        vx, vy = bx - ax, by - ay
        seg2 = vx * vx + vy * vy
        t = 0.0 if seg2 == 0 else min(1.0, max(0.0, ((px - ax) * vx + (py - ay) * vy) / seg2))
        d2 = (px - ax - t * vx) ** 2 + (py - ay - t * vy) ** 2
        if d2 < best_d2:
            best_d2, best_along = d2, cumulative[i] + t * math.sqrt(seg2)
    return math.sqrt(best_d2), best_along


def bearing_deg(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Compass bearing from a to b in flat metres: 0 = north, 90 = east."""
    return math.degrees(math.atan2(b[0] - a[0], b[1] - a[1])) % 360


def turn_deg(before: float, after: float) -> float:
    """Signed turn from one bearing to another, -180..180. Positive = right."""
    return (after - before + 180) % 360 - 180


def cardinal(bearing: float) -> str:
    return CARDINALS[int((bearing + 22.5) // 45) % 8]
