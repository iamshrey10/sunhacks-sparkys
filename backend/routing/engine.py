"""Route engine. Owner: Rohan.

Finds the fastest and the coolest walking route on the precomputed graph in
data/processed/ (built by backend/shade/build_shade.py).

    fastest: minimises length
    coolest: minimises  length * (1 + shade_weight * sun_fraction * k)

where sun_fraction = 1 - shade fraction of the segment at the chosen time layer
and k grows with heat_sensitivity. Every number returned is computed from the
graph and shade layers; nothing here is hand-written.

Runtime needs only the standard library plus the API's own dependencies, so the
API can be deployed without the geo stack.
"""

import heapq
import json
import math
from collections.abc import Callable
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException

from backend.api.schemas import LatLng, RouteOption, RouteRequest, RouteResponse

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "processed"

LAYERS = ["09:00", "12:00", "15:00", "18:00"]
# How much a metre in full sun costs relative to a metre in shade is
# 1 + shade_weight * k. With the default shade_weight of 0.7 that is
# 1.7x / 2.4x / 3.8x for low / normal / high sensitivity.
HEAT_K = {"low": 1.0, "normal": 2.0, "high": 4.0}
WALK_SPEED_MPS = 1.35
# Refuse to route from a point further than this from the mapped network.
MAX_SNAP_M = 250.0
EARTH_RADIUS_M = 6_371_000.0


class Graph:
    def __init__(self, raw: dict) -> None:
        self.nodes: list[tuple[float, float]] = [tuple(n) for n in raw["nodes"]]
        self.edges: list[list] = raw["edges"]  # [u, v, length_m, is_steps, geometry]
        self.adjacency: list[list[tuple[int, int]]] = [[] for _ in self.nodes]
        for edge_id, (u, v, *_rest) in enumerate(self.edges):
            self.adjacency[u].append((v, edge_id))
            self.adjacency[v].append((u, edge_id))
        self.walkable = self._largest_component(allow_steps=True)
        self.step_free = self._largest_component(allow_steps=False)

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

    def nearest_node(self, point: LatLng, candidates: frozenset[int]) -> tuple[int, float]:
        """Closest candidate node and its distance in metres."""
        cos_lat = math.cos(math.radians(point.lat))

        def distance(node: int) -> float:
            lat, lng = self.nodes[node]
            dy = math.radians(lat - point.lat)
            dx = math.radians(lng - point.lng) * cos_lat
            return EARTH_RADIUS_M * math.hypot(dx, dy)

        node = min(candidates, key=distance)
        return node, distance(node)

    def shortest_path(self, start: int, end: int, cost: Callable[[int], float],
                      allow_steps: bool) -> list[tuple[int, int]]:
        """Dijkstra. Returns the path as (edge id, node the edge is entered from)."""
        best = {start: 0.0}
        came_from: dict[int, tuple[int, int]] = {}
        queue = [(0.0, start)]
        while queue:
            dist, node = heapq.heappop(queue)
            if node == end:
                break
            if dist > best[node]:
                continue
            for neighbour, edge_id in self.adjacency[node]:
                if not allow_steps and self.edges[edge_id][3]:
                    continue
                candidate = dist + cost(edge_id)
                if candidate < best.get(neighbour, math.inf):
                    best[neighbour] = candidate
                    came_from[neighbour] = (edge_id, node)
                    heapq.heappush(queue, (candidate, neighbour))
        if end != start and end not in came_from:
            raise HTTPException(status_code=422, detail="No walking route found between these points")
        path = []
        node = end
        while node != start:
            edge_id, node = came_from[node]
            path.append((edge_id, node))
        path.reverse()
        return path


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


def nearest_layer(depart_time: str) -> str:
    """Snap HH:MM to the closest precomputed layer (earlier layer on a tie)."""
    def minutes(hhmm: str) -> int:
        return int(hhmm[:2]) * 60 + int(hhmm[3:])

    return min(LAYERS, key=lambda layer: abs(minutes(layer) - minutes(depart_time)))


def _snap(graph: Graph, point: LatLng, candidates: frozenset[int], label: str) -> int:
    node, distance = graph.nearest_node(point, candidates)
    if distance > MAX_SNAP_M:
        raise HTTPException(
            status_code=422,
            detail=f"The {label} point is outside the mapped area (ASU Tempe and Mill Ave)",
        )
    return node


def _build_option(kind: str, graph: Graph, shade: list[float],
                  path: list[tuple[int, int]], start: int) -> RouteOption:
    geometry: list[tuple[float, float]] = [graph.nodes[start]]
    distance = shaded = 0.0
    stairs = 0
    on_stairs = False
    for edge_id, from_node in path:
        u, _v, length, is_steps, coords = graph.edges[edge_id]
        points = coords if from_node == u else coords[::-1]
        geometry.extend(tuple(p) for p in points[1:])
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
    layer = nearest_layer(req.depart_time)
    shade = load_shade(layer)

    allow_steps = not req.prefs.avoid_stairs
    candidates = graph.walkable if allow_steps else graph.step_free
    start = _snap(graph, req.start, candidates, "start")
    end = _snap(graph, req.end, candidates, "end")

    sun_penalty = req.prefs.shade_weight * HEAT_K[req.prefs.heat_sensitivity]
    edges = graph.edges

    def length_cost(edge_id: int) -> float:
        return edges[edge_id][2]

    def heat_cost(edge_id: int) -> float:
        return edges[edge_id][2] * (1 + sun_penalty * (1 - shade[edge_id]))

    fastest = graph.shortest_path(start, end, length_cost, allow_steps)
    coolest = graph.shortest_path(start, end, heat_cost, allow_steps)

    return RouteResponse(
        fastest=_build_option("fastest", graph, shade, fastest, start),
        coolest=_build_option("coolest", graph, shade, coolest, start),
        depart_time=req.depart_time,
        shade_layer=layer,
    )
