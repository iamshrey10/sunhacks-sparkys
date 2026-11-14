"""Route engine. Owner: Rohan.

Finds the fastest and the coolest walking route on the precomputed graph in
data/processed/ (built by backend/shade/build_shade.py).

    fastest: minimises length
    coolest: minimises  length * (1 + shade_weight * sun_fraction * k)

where sun_fraction = 1 - shade fraction of the segment at the chosen time layer
and k grows with heat_sensitivity. Every number returned is computed from the
graph and shade layers; nothing here is hand-written.

The start and end are snapped to the nearest point on a walkable segment (not
the nearest junction), so a route begins and ends beside the requested points.

Runtime needs only the standard library plus the API's own dependencies, so the
API can be deployed without the geo stack.
"""

import heapq
import json
import math
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException

from backend.api.schemas import LatLng, RouteOption, RouteRequest, RouteResponse

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "processed"

# How much a metre in full sun costs relative to a metre in shade is
# 1 + shade_weight * k. With the default shade_weight of 0.7 that is
# 1.7x / 2.4x / 3.8x for low / normal / high sensitivity.
HEAT_K = {"low": 1.0, "normal": 2.0, "high": 4.0}
WALK_SPEED_MPS = 1.35
# Refuse to route from a point further than this from the mapped network.
MAX_SNAP_M = 250.0
EARTH_RADIUS_M = 6_371_000.0

# Temporary node ids for the snapped start and end of one request.
START, END = -1, -2


@dataclass(frozen=True)
class Snap:
    """A point on a segment: between geometry points `index` and `index + 1`."""

    edge_id: int
    index: int
    point: list[float]  # [lat, lng]
    fraction: float  # share of the segment's length from its u end, 0-1
    distance_m: float  # from the requested point


class Graph:
    def __init__(self, raw: dict) -> None:
        self.layers: list[str] = raw["meta"]["layers"]
        self.nodes: list[tuple[float, float]] = [tuple(n) for n in raw["nodes"]]
        self.edges: list[list] = raw["edges"]  # [u, v, length_m, is_steps, geometry]
        self.lengths: list[float] = [e[2] for e in self.edges]
        self.adjacency: list[list[tuple[int, int]]] = [[] for _ in self.nodes]
        for edge_id, (u, v, *_rest) in enumerate(self.edges):
            self.adjacency[u].append((v, edge_id))
            self.adjacency[v].append((u, edge_id))
        self.walkable = self._largest_component(allow_steps=True)
        self.step_free = self._largest_component(allow_steps=False)

        # Flat local coordinates in metres, for nearest-point searches.
        lat0, lng0 = raw["meta"]["center"]
        self._origin = (lat0, lng0)
        self._metres_per_deg = (
            math.radians(1) * EARTH_RADIUS_M,
            math.radians(1) * EARTH_RADIUS_M * math.cos(math.radians(lat0)),
        )
        self._xy = [[self._to_xy(lat, lng) for lat, lng in e[4]] for e in self.edges]
        self._bbox = [
            (min(x for x, _ in pts), min(y for _, y in pts),
             max(x for x, _ in pts), max(y for _, y in pts))
            for pts in self._xy
        ]

    def _to_xy(self, lat: float, lng: float) -> tuple[float, float]:
        return ((lng - self._origin[1]) * self._metres_per_deg[1],
                (lat - self._origin[0]) * self._metres_per_deg[0])

    def _largest_component(self, allow_steps: bool) -> frozenset[int]:
        """Nodes of the largest connected part, so a snapped point can always be routed."""
        seen: set[int] = set()
        best: list[int] = []
        for start in range(len(self.nodes)):
            if start in seen:
                continue
            seen.add(start)
            component, stack = [start], [start]
            while stack:
                for neighbour, edge_id in self.adjacency[stack.pop()]:
                    if neighbour in seen or (not allow_steps and self.edges[edge_id][3]):
                        continue
                    seen.add(neighbour)
                    component.append(neighbour)
                    stack.append(neighbour)
            if len(component) > len(best):
                best = component
        return frozenset(best)

    def snap(self, point: LatLng, allow_steps: bool) -> Snap:
        """Nearest point on a routable segment."""
        nodes = self.walkable if allow_steps else self.step_free
        px, py = self._to_xy(point.lat, point.lng)
        best_d2, best = math.inf, None
        for edge_id, (u, _v, _length, is_steps, _coords) in enumerate(self.edges):
            if u not in nodes or (is_steps and not allow_steps):
                continue
            x0, y0, x1, y1 = self._bbox[edge_id]
            dx = max(x0 - px, 0.0, px - x1)
            dy = max(y0 - py, 0.0, py - y1)
            if dx * dx + dy * dy >= best_d2:
                continue
            pts = self._xy[edge_id]
            for i in range(len(pts) - 1):
                (ax, ay), (bx, by) = pts[i], pts[i + 1]
                vx, vy = bx - ax, by - ay
                seg2 = vx * vx + vy * vy
                t = 0.0 if seg2 == 0 else min(1.0, max(0.0, ((px - ax) * vx + (py - ay) * vy) / seg2))
                d2 = (px - ax - t * vx) ** 2 + (py - ay - t * vy) ** 2
                if d2 < best_d2:
                    best_d2, best = d2, (edge_id, i, t)

        edge_id, i, t = best
        pts, coords = self._xy[edge_id], self.edges[edge_id][4]
        steps = [math.dist(pts[k], pts[k + 1]) for k in range(len(pts) - 1)]
        total = sum(steps)
        a, b = coords[i], coords[i + 1]
        return Snap(
            edge_id=edge_id,
            index=i,
            point=[round(a[0] + t * (b[0] - a[0]), 6), round(a[1] + t * (b[1] - a[1]), 6)],
            fraction=(sum(steps[:i]) + t * steps[i]) / total if total else 0.0,
            distance_m=math.sqrt(best_d2),
        )


@lru_cache
def load_graph() -> Graph:
    path = DATA_DIR / "graph.json"
    if not path.exists():
        raise NotImplementedError("Shade data not built yet: run backend/shade/build_shade.py")
    return Graph(json.loads(path.read_text(encoding="utf-8")))


@lru_cache
def load_shade(layer: str) -> list[float]:
    """Shade fraction per segment for one time layer, indexed by segment id."""
    path = DATA_DIR / f"shade_{layer.replace(':', '')}.json"
    if not path.exists():
        raise NotImplementedError(f"Shade layer {layer} not built yet")
    by_id = json.loads(path.read_text(encoding="utf-8"))
    return [by_id[str(i)] for i in range(len(load_graph().edges))]


def nearest_layer(depart_time: str, layers: list[str] | None = None) -> str:
    """Snap HH:MM to the closest precomputed layer (earlier layer on a tie)."""
    def minutes(hhmm: str) -> int:
        return int(hhmm[:2]) * 60 + int(hhmm[3:])

    layers = layers or load_graph().layers
    return min(layers, key=lambda layer: abs(minutes(layer) - minutes(depart_time)))


def _snap(graph: Graph, point: LatLng, allow_steps: bool, label: str) -> Snap:
    snap = graph.snap(point, allow_steps)
    if snap.distance_m > MAX_SNAP_M:
        raise HTTPException(
            status_code=422,
            detail=f"The {label} point is outside the mapped area (ASU Tempe and Mill Ave)",
        )
    return snap


def _connectors(graph: Graph, start: Snap, end: Snap) -> list[list]:
    """Temporary segments joining the snapped start and end to the graph.

    Same layout as a graph edge, plus the id of the segment each one is cut
    from: [from, to, length_m, is_steps, geometry, parent_edge_id].
    """
    def halves(snap: Snap):
        u, v, length, is_steps, coords = graph.edges[snap.edge_id]
        to_u = [snap.point, *coords[snap.index::-1]]
        to_v = [snap.point, *coords[snap.index + 1:]]
        return (u, length * snap.fraction, to_u), (v, length * (1 - snap.fraction), to_v), is_steps

    out = []
    *sides, is_steps = halves(start)
    for node, length, coords in sides:
        out.append([START, node, length, is_steps, coords, start.edge_id])
    *sides, is_steps = halves(end)
    for node, length, coords in sides:
        out.append([node, END, length, is_steps, coords[::-1], end.edge_id])

    if start.edge_id == end.edge_id:
        # Both points are on one segment: allow walking straight along it.
        length, coords = graph.edges[start.edge_id][2], graph.edges[start.edge_id][4]
        first, last = sorted((start, end), key=lambda s: (s.index, s.fraction))
        between = [first.point, *coords[first.index + 1:last.index + 1], last.point]
        if first is not start:
            between.reverse()
        out.append([START, END, length * abs(end.fraction - start.fraction),
                    is_steps, between, start.edge_id])
    return out


def _shortest_path(graph: Graph, links: dict[int, list[tuple[int, int]]],
                   cost: list[float], blocked: list[bool] | None) -> list[tuple[int, int]]:
    """Dijkstra from START to END. Returns (edge id, node the edge is entered from).

    `links` holds the temporary connectors; `cost` and `blocked` are indexed by
    edge id, graph edges first and connectors after them.
    """
    adjacency = graph.adjacency
    best = {START: 0.0}
    came_from: dict[int, tuple[int, int]] = {}
    queue = [(0.0, START)]
    while queue:
        dist, node = heapq.heappop(queue)
        if node == END:
            break
        if dist > best[node]:
            continue
        neighbours = links.get(node, ())
        if node >= 0:
            neighbours = [*adjacency[node], *neighbours]
        for neighbour, edge_id in neighbours:
            if blocked and blocked[edge_id]:
                continue
            candidate = dist + cost[edge_id]
            if candidate < best.get(neighbour, math.inf):
                best[neighbour] = candidate
                came_from[neighbour] = (edge_id, node)
                heapq.heappush(queue, (candidate, neighbour))
    if END not in came_from:
        raise HTTPException(status_code=422, detail="No walking route found between these points")
    path = []
    node = END
    while node != START:
        edge_id, node = came_from[node]
        path.append((edge_id, node))
    path.reverse()
    return path


def _build_option(kind: str, edges: list[list], shade: list[float],
                  path: list[tuple[int, int]]) -> RouteOption:
    geometry: list[tuple[float, float]] = []
    distance = shaded = 0.0
    stairs = 0
    on_stairs = False
    for edge_id, from_node in path:
        u, _v, length, is_steps, coords = edges[edge_id][:5]
        for lat, lng in coords if from_node == u else coords[::-1]:
            if not geometry or geometry[-1] != (lat, lng):
                geometry.append((lat, lng))
        distance += length
        shaded += length * shade[edge_id]
        # Consecutive step segments are one flight of stairs.
        if is_steps and not on_stairs:
            stairs += 1
        on_stairs = bool(is_steps)
    return RouteOption(
        kind=kind,
        geometry=geometry,
        distance_m=round(distance, 1),
        duration_s=round(distance / WALK_SPEED_MPS, 1),
        shade_pct=round(100 * shaded / distance, 1) if distance else 0.0,
        sun_exposed_s=round((distance - shaded) / WALK_SPEED_MPS, 1),
        stairs_count=stairs,
    )


def compute_routes(req: RouteRequest) -> RouteResponse:
    graph = load_graph()
    layer = nearest_layer(req.depart_time, graph.layers)
    layer_shade = load_shade(layer)

    allow_steps = not req.prefs.avoid_stairs
    start = _snap(graph, req.start, allow_steps, "start")
    end = _snap(graph, req.end, allow_steps, "end")

    # Graph edges first, then this request's connectors, all indexed by edge id.
    connectors = _connectors(graph, start, end)
    first_id = len(graph.edges)
    edges = [*graph.edges, *connectors]
    lengths = [*graph.lengths, *(c[2] for c in connectors)]
    shade = [*layer_shade, *(layer_shade[c[5]] for c in connectors)]
    links: dict[int, list[tuple[int, int]]] = {}
    for offset, connector in enumerate(connectors):
        links.setdefault(connector[0], []).append((connector[1], first_id + offset))

    sun_penalty = req.prefs.shade_weight * HEAT_K[req.prefs.heat_sensitivity]
    heat_cost = [length * (1 + sun_penalty * (1 - s)) for length, s in zip(lengths, shade)]
    blocked = None if allow_steps else [bool(e[3]) for e in edges]

    fastest = _shortest_path(graph, links, lengths, blocked)
    coolest = _shortest_path(graph, links, heat_cost, blocked)

    return RouteResponse(
        fastest=_build_option("fastest", edges, shade, fastest),
        coolest=_build_option("coolest", edges, shade, coolest),
        depart_time=req.depart_time,
        shade_layer=layer,
    )
