"""Turn-by-turn directions for a planned route. Owner: Rohan.

Built from the same path the route finder chose (so the steps always match the
line drawn on the map), using street names and stairs from the graph and the
shade layer for the chosen time.

    steps = compute_directions(req, "coolest").steps

Not wired into the API yet: that needs the models in backend/api/schemas.py.
"""

from collections import defaultdict
from dataclasses import dataclass, field

from backend.api.schemas import RouteRequest
from backend.routing.engine import WALK_SPEED_MPS, Plan, load_graph, plan_routes
from backend.routing.geo import (
    Frame, bearing_deg, cardinal, cumulative_lengths, turn_deg,
)

# A turn is measured between the direction walked over the last LOOK_M metres
# and the direction over the next LOOK_M metres, which smooths out the zigzags
# that OpenStreetMap paths have at junctions.
LOOK_M = 15.0
TURN_MIN_DEG = 35.0
CLEAR_TURN_DEG = 60.0
SHARP_DEG = 120.0
U_TURN_DEG = 160.0
# Several candidate turns close together are one junction: keep the sharpest.
CLUSTER_M = 15.0


@dataclass
class Step:
    instruction: str
    maneuver: str
    street: str | None
    lat: float
    lng: float
    start_along_m: float
    distance_m: float = 0.0
    duration_s: float = 0.0
    shade_pct: float = 0.0
    stairs: bool = False


@dataclass
class Directions:
    kind: str
    steps: list[Step]
    geometry: list[tuple[float, float]]
    distance_m: float
    duration_s: float
    shade_layer: str
    extra: dict = field(default_factory=dict)


@dataclass
class _Segment:
    """The stretch between two consecutive points of the route."""

    length: float
    name: str | None
    stairs: bool
    shade: float


def compute_directions(req: RouteRequest, kind: str = "coolest") -> Directions:
    plan = plan_routes(req)
    path = plan.coolest if kind == "coolest" else plan.fastest
    points, segments = _expand(plan, path)
    return Directions(
        kind=kind,
        steps=build_steps(points, segments),
        geometry=points,
        distance_m=round(sum(s.length for s in segments), 1),
        duration_s=round(sum(s.length for s in segments) / WALK_SPEED_MPS, 1),
        shade_layer=plan.layer,
    )


def _expand(plan: Plan, path) -> tuple[list[tuple[float, float]], list[_Segment]]:
    """Route as points plus one segment per consecutive pair, in walking order."""
    graph = load_graph()
    points: list[tuple[float, float]] = []
    segments: list[_Segment] = []
    frame = Frame(graph.nodes[0][0])
    for edge_id, from_node in path:
        u, _v, length, is_steps, coords = plan.edges[edge_id][:5]
        coords = [tuple(c) for c in (coords if from_node == u else coords[::-1])]
        name = graph.street_names[plan.parents.get(edge_id, edge_id)]
        shade = plan.shade[edge_id]
        if points and points[-1] == coords[0]:
            coords = coords[1:]
        elif points:
            raise ValueError("route edges do not join up")
        chain = [points[-1], *coords] if points else coords
        xy = [frame.xy(*c) for c in chain]
        lengths = [b - a for a, b in zip(cumulative_lengths(xy), cumulative_lengths(xy)[1:])]
        scale = length / sum(lengths) if sum(lengths) else 0.0
        for dist in lengths:
            segments.append(_Segment(dist * scale, name, bool(is_steps), shade))
        points.extend(coords if points else coords)
    return points, segments


def build_steps(points: list[tuple[float, float]], segments: list[_Segment]) -> list[Step]:
    """Group a route into steps at turns, name changes and stairs."""
    if len(points) < 2:
        lat, lng = points[0] if points else (0.0, 0.0)
        return [Step("Arrive at your destination", "arrive", None, lat, lng, 0.0)]

    frame = Frame(points[0][0])
    xy = [frame.xy(*p) for p in points]
    along = [0.0]
    for seg in segments:
        along.append(along[-1] + seg.length)
    total = along[-1]

    breaks = _find_breaks(xy, along, segments)  # [(vertex index, maneuver, turn)]
    bounds = [0, *[i for i, _m, _t in breaks], len(points) - 1]
    maneuvers = ["depart", *[m for _i, m, _t in breaks]]

    steps: list[Step] = []
    for k, maneuver in enumerate(maneuvers):
        first, last = bounds[k], bounds[k + 1]
        run = segments[first:last]
        length = sum(s.length for s in run)
        street = _main_street(run)
        stairs = any(s.stairs for s in run)
        if stairs and maneuver not in ("depart", "stairs"):
            maneuver = "stairs"
        step = Step(
            instruction="",
            maneuver=maneuver,
            street=street,
            lat=points[first][0],
            lng=points[first][1],
            start_along_m=round(along[first], 1),
            distance_m=round(length, 1),
            duration_s=round(length / WALK_SPEED_MPS, 1),
            shade_pct=round(100 * sum(s.length * s.shade for s in run) / length, 1) if length else 0.0,
            stairs=stairs,
        )
        step.instruction = _instruction(step, bearing_deg(xy[first], xy[min(_ahead(xy, along, first), len(xy) - 1)]))
        steps.append(step)

    steps.append(Step("Arrive at your destination", "arrive", None, points[-1][0], points[-1][1],
                      round(total, 1)))
    return steps


def _find_breaks(xy, along, segments) -> list[tuple[int, str, float]]:
    candidates: list[tuple[int, str, float]] = []
    for i in range(1, len(xy) - 1):
        before, after = segments[i - 1], segments[i]
        turn = turn_deg(
            bearing_deg(xy[_back(xy, along, i)], xy[i]),
            bearing_deg(xy[i], xy[_ahead(xy, along, i)]),
        )
        if before.stairs != after.stairs:
            candidates.append((i, "stairs" if after.stairs else _turn_name(turn, "continue"), turn))
        elif abs(turn) >= CLEAR_TURN_DEG:
            candidates.append((i, _turn_name(turn), turn))
        elif before.name != after.name and (before.name or after.name):
            # Footpaths curve, so a gentle bend is only worth saying when the street changes.
            candidates.append((i, _turn_name(turn, "continue"), turn))

    # One break per junction: of nearby candidates keep the one that turns most,
    # but never drop a stairs boundary.
    breaks: list[tuple[int, str, float]] = []
    for cand in candidates:
        if breaks and cand[1] != "stairs" and breaks[-1][1] != "stairs" \
                and along[cand[0]] - along[breaks[-1][0]] < CLUSTER_M:
            if abs(cand[2]) > abs(breaks[-1][2]):
                breaks[-1] = cand
            continue
        breaks.append(cand)
    return breaks


def _back(xy, along, i: int) -> int:
    j = i
    while j > 0 and along[i] - along[j] < LOOK_M:
        j -= 1
    return j


def _ahead(xy, along, i: int) -> int:
    j = i
    while j < len(xy) - 1 and along[j] - along[i] < LOOK_M:
        j += 1
    return j


def _turn_name(turn: float, otherwise: str = "continue") -> str:
    size = abs(turn)
    if size < TURN_MIN_DEG:
        return otherwise
    side = "right" if turn > 0 else "left"
    if size >= U_TURN_DEG:
        return "u_turn"
    if size >= SHARP_DEG:
        return f"sharp_{side}"
    if size >= 60:
        return side
    return f"slight_{side}"


def _main_street(run: list[_Segment]) -> str | None:
    """The street this step mostly follows, if OpenStreetMap names it."""
    lengths: dict[str, float] = defaultdict(float)
    for seg in run:
        if seg.name:
            lengths[seg.name] += seg.length
    return max(lengths, key=lengths.get) if lengths else None


def _instruction(step: Step, heading: float) -> str:
    street = step.street
    onto = f" onto {street}" if street else ""
    match step.maneuver:
        case "depart":
            return f"Head {cardinal(heading)}" + (f" on {street}" if street else "")
        case "stairs":
            return "Take the stairs" + (f" on {street}" if street else "")
        case "continue":
            return f"Continue{onto}" if street else "Continue straight"
        case "u_turn":
            return "Make a U-turn"
        case "left" | "right":
            return f"Turn {step.maneuver}{onto}"
        case other:  # slight_left, slight_right, sharp_left, sharp_right
            speed, side = other.split("_")
            return f"{'Bear' if speed == 'slight' else 'Turn sharp'} {side}{onto}"
