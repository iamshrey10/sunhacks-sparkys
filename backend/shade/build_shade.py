"""Precompute shade per street segment. Owner: Rohan.

Reads the raw OSM files written by fetch_osm.py and writes, into data/processed/:

    graph.json        compact walking graph used by the route finder
    shade_<HHMM>.json segment id -> shade fraction 0-1, one file per time of day

Model (an estimate from map data, not a measurement):
  * Sun position from pvlib for DATE at each of TIMES (America/Phoenix).
  * Every building footprint is extruded to its height and its shadow is
    projected on flat ground with Shapely.
  * Trees cast a canopy-sized shadow, counted as partial shade (TREE_SHADE).
  * Covered walkways (OSM `covered` / `tunnel` tags, plus the hand-labelled
    list in covered.json) are fully shaded at every time.
  * Each segment is sampled every SAMPLE_STEP_M metres; its shade fraction is
    the mean shade of its sample points.

Run from the repo root, after fetch_osm:
    python -m backend.shade.build_shade
    python -m backend.shade.build_shade --plot 15:00   # also save a PNG to data/raw/
"""

import argparse
import json
import math
import re
from pathlib import Path

import geopandas as gpd
import numpy as np
import osmnx as ox
import pandas as pd
import pvlib
import shapely
from shapely.affinity import translate
from shapely.geometry import LineString

from backend.shade.fetch_osm import BUILDINGS_PATH, CENTER, GRAPH_PATH, RAW_DIR, TREES_PATH

REPO_ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = REPO_ROOT / "data" / "processed"
COVERED_PATH = Path(__file__).resolve().parent / "covered.json"

DATE = "2026-07-15"  # mid-July, the hottest part of the year in Tempe
TIMEZONE = "America/Phoenix"
TIMES = ["09:00", "12:00", "15:00", "18:00"]
METRIC_CRS = "EPSG:32612"  # UTM zone 12N, metres

# Building height: OSM `height` if present, else `building:levels` x 3 m, else
# a default by building type. Only about 8% of buildings in the area carry a
# height or levels tag, so these defaults matter:
LEVEL_HEIGHT_M = 3.0
DEFAULT_HEIGHT_M = 6.0  # untagged building: assume two storeys
DEFAULT_HEIGHT_BY_TYPE_M = {
    # campus and multi-family buildings are usually 3-5 storeys
    "university": 12.0, "college": 12.0, "dormitory": 12.0, "apartments": 12.0,
    "hotel": 12.0, "office": 12.0, "commercial": 9.0, "parking": 12.0,
    "stadium": 20.0, "retail": 6.0,
    # single-storey structures and open canopies
    "roof": 4.0, "carport": 3.0, "garage": 3.0, "garages": 3.0, "shed": 3.0,
    "house": 5.0, "residential": 5.0, "detached": 5.0,
}

# Trees. OSM gives a point per tree and rarely a crown size, so we assume one.
TREE_CROWN_RADIUS_M = 3.0
PALM_CROWN_RADIUS_M = 1.5  # palms (e.g. Palm Walk) give very little shade
TREE_CROWN_BOTTOM_M = 2.5
TREE_CROWN_TOP_M = 6.0
TREE_SHADE = 0.7  # canopy shade is dappled, count it as 70%

SAMPLE_STEP_M = 4.0
COVERED_VALUES = {"yes", "arcade", "colonnade", "building_passage", "covered"}
TUNNEL_VALUES = {"yes", "building_passage", "covered"}


# ---------- sun ----------

def sun_position(hhmm: str) -> tuple[float, float]:
    """Sun (elevation, azimuth) in degrees at the demo-area centre."""
    when = pd.DatetimeIndex([f"{DATE} {hhmm}"], tz=TIMEZONE)
    pos = pvlib.solarposition.get_solarposition(when, CENTER[0], CENTER[1])
    return float(pos["apparent_elevation"].iloc[0]), float(pos["azimuth"].iloc[0])


def shadow_offset_per_metre(elevation: float, azimuth: float) -> tuple[float, float]:
    """Ground displacement (east, north) of the shadow of a point 1 m high.

    Azimuth is clockwise from north and points at the sun; the shadow falls the
    opposite way, with length height / tan(elevation).
    """
    reach = 1.0 / math.tan(math.radians(elevation))
    az = math.radians(azimuth)
    return -math.sin(az) * reach, -math.cos(az) * reach


# ---------- shadows ----------

def building_height(row) -> float:
    height = _parse_metres(row.get("height"))
    if height:
        return height
    levels = _parse_number(row.get("building:levels"))
    if levels and levels > 0:
        return levels * LEVEL_HEIGHT_M
    return DEFAULT_HEIGHT_BY_TYPE_M.get(str(row.get("building")), DEFAULT_HEIGHT_M)


def _parse_number(value) -> float | None:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    match = re.search(r"\d+(\.\d+)?", str(value))
    return float(match.group()) if match else None


def _parse_metres(value) -> float | None:
    number = _parse_number(value)
    if number is None or number <= 0:
        return None
    text = str(value).lower()
    return number * 0.3048 if ("ft" in text or "'" in text) else number


def sweep(polygon, dx: float, dy: float) -> list:
    """Pieces whose union is `polygon` swept along the vector (dx, dy).

    That union is the ground shadow of a prism with this footprint: the
    footprint, the footprint moved to the shadow of the roof, and one
    parallelogram per wall.
    """
    pieces = [polygon, translate(polygon, dx, dy)]
    shift = np.array([dx, dy])
    for ring in [polygon.exterior, *polygon.interiors]:
        coords = np.asarray(ring.coords)[:, :2]
        a, b = coords[:-1], coords[1:]
        quads = shapely.polygons(np.stack([a, b, b + shift, a + shift], axis=1))
        pieces.extend(quads[shapely.area(quads) > 1e-6])
    return pieces


def building_shadow_pieces(buildings: gpd.GeoDataFrame, offset) -> list:
    pieces = []
    for geom, height in zip(buildings.geometry, buildings["height_m"]):
        for polygon in getattr(geom, "geoms", [geom]):
            pieces.extend(sweep(polygon, offset[0] * height, offset[1] * height))
    return pieces


def tree_shadow_pieces(trees: gpd.GeoDataFrame, offset) -> list:
    low = (offset[0] * TREE_CROWN_BOTTOM_M, offset[1] * TREE_CROWN_BOTTOM_M)
    rise = TREE_CROWN_TOP_M - TREE_CROWN_BOTTOM_M
    span = (offset[0] * rise, offset[1] * rise)
    pieces = []
    for geom, leaf_type in zip(trees.geometry, trees["leaf_type"]):
        if leaf_type == "leafless":
            continue
        if geom.geom_type == "Point":
            radius = PALM_CROWN_RADIUS_M if leaf_type == "palm" else TREE_CROWN_RADIUS_M
            start = (geom.x + low[0], geom.y + low[1])
            end = (start[0] + span[0], start[1] + span[1])
            pieces.append(LineString([start, end]).buffer(radius))
            continue
        # Tree rows become a strip of canopy, woods keep their outline.
        crown = geom.buffer(TREE_CROWN_RADIUS_M) if geom.geom_type == "LineString" else geom
        for polygon in getattr(crown, "geoms", [crown]):
            pieces.extend(sweep(translate(polygon, *low), *span))
    return pieces


# ---------- graph ----------

def load_segments() -> tuple[gpd.GeoDataFrame, dict]:
    """Undirected walking segments (lat/lng) and node id -> (lat, lng)."""
    graph = ox.convert.to_undirected(ox.load_graphml(GRAPH_PATH))
    nodes = {n: (d["y"], d["x"]) for n, d in graph.nodes(data=True)}
    edges = ox.convert.graph_to_gdfs(graph, nodes=False).sort_index().reset_index()
    edges = edges[edges["u"] != edges["v"]].reset_index(drop=True)
    for column in ("covered", "tunnel"):
        if column not in edges.columns:
            edges[column] = None
    return edges, nodes


def is_covered(row) -> bool:
    return str(row["covered"]) in COVERED_VALUES or str(row["tunnel"]) in TUNNEL_VALUES


def sample_points(edges_m: gpd.GeoDataFrame) -> tuple[np.ndarray, np.ndarray]:
    """Points every SAMPLE_STEP_M along each segment, and their segment index."""
    lengths = edges_m.geometry.length.to_numpy()
    counts = np.maximum(1, np.round(lengths / SAMPLE_STEP_M).astype(int))
    segment = np.repeat(np.arange(len(edges_m)), counts)
    position = np.concatenate([(np.arange(n) + 0.5) / n for n in counts])
    lines = edges_m.geometry.to_numpy()[segment]
    points = shapely.line_interpolate_point(lines, position * lengths[segment])
    return points, segment


def points_within(points: np.ndarray, polygons: list) -> np.ndarray:
    """Boolean mask: which points fall inside any of the polygons."""
    mask = np.zeros(len(points), dtype=bool)
    if polygons:
        tree = shapely.STRtree(polygons)
        mask[np.unique(tree.query(points, predicate="within")[0])] = True
    return mask


def load_covered_areas() -> list:
    """Hand-labelled covered walkways as (polygon in metres, shade value)."""
    if not COVERED_PATH.exists():
        return []
    walkways = json.loads(COVERED_PATH.read_text(encoding="utf-8")).get("walkways", [])
    areas = []
    for walkway in walkways:
        line = LineString([(lng, lat) for lat, lng in walkway["path"]])
        line_m = gpd.GeoSeries([line], crs="EPSG:4326").to_crs(METRIC_CRS).iloc[0]
        areas.append((line_m.buffer(walkway.get("buffer_m", 6.0)), walkway.get("shade", 1.0)))
    return areas


def segment_shade(points, segment, n_segments, covered_segments, covered_areas,
                  building_pieces, tree_pieces) -> np.ndarray:
    shade = np.zeros(len(points))
    shade[points_within(points, tree_pieces)] = TREE_SHADE
    shade[points_within(points, building_pieces)] = 1.0
    for area, value in covered_areas:
        inside = points_within(points, [area])
        shade[inside] = np.maximum(shade[inside], value)
    totals = np.bincount(segment, weights=shade, minlength=n_segments)
    fractions = totals / np.bincount(segment, minlength=n_segments)
    fractions[covered_segments] = 1.0
    return fractions


# ---------- output ----------

def write_graph(edges: gpd.GeoDataFrame, nodes: dict, sun: dict) -> None:
    node_ids = sorted(set(edges["u"]) | set(edges["v"]))
    index = {node: i for i, node in enumerate(node_ids)}
    out_edges = []
    for row in edges.itertuples():
        coords = [(round(lat, 6), round(lng, 6)) for lng, lat in row.geometry.coords]
        # Store geometry running from u to v.
        if _dist2(coords[0], nodes[row.u]) > _dist2(coords[-1], nodes[row.u]):
            coords.reverse()
        out_edges.append([
            index[row.u], index[row.v], round(float(row.length), 1),
            1 if row.highway == "steps" else 0, coords,
        ])
    graph = {
        "meta": {
            "center": CENTER,
            "date": DATE,
            "timezone": TIMEZONE,
            "layers": TIMES,
            "sun": sun,
            "edge_format": ["u", "v", "length_m", "is_steps", "geometry [lat, lng]"],
            "segment_id": "index into edges, as a string",
        },
        "nodes": [[round(nodes[n][0], 6), round(nodes[n][1], 6)] for n in node_ids],
        "edges": out_edges,
    }
    _write_json(PROCESSED_DIR / "graph.json", graph)


def _dist2(a, b) -> float:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2


def _write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")


def plot_layer(hhmm, buildings, building_pieces, tree_pieces, edges_m, fractions) -> Path:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(14, 14))
    gpd.GeoSeries([shapely.union_all(building_pieces)]).plot(ax=ax, color="#1f2a44", alpha=0.45)
    if tree_pieces:
        gpd.GeoSeries([shapely.union_all(tree_pieces)]).plot(ax=ax, color="#2e7d32", alpha=0.5)
    buildings.plot(ax=ax, color="#c9c9c9", edgecolor="#777777", linewidth=0.3)
    edges_m.assign(shade=fractions).plot(
        ax=ax, column="shade", cmap="RdYlBu", vmin=0, vmax=1, linewidth=1.0,
        legend=True, legend_kwds={"label": "segment shade fraction", "shrink": 0.6},
    )
    centre = gpd.GeoSeries.from_xy([CENTER[1]], [CENTER[0]], crs="EPSG:4326").to_crs(METRIC_CRS).iloc[0]
    ax.set_xlim(centre.x - 600, centre.x + 600)
    ax.set_ylim(centre.y - 600, centre.y + 600)
    elevation, azimuth = sun_position(hhmm)
    ax.set_title(f"Shade at {hhmm} on {DATE}  (sun elevation {elevation:.0f}°, azimuth {azimuth:.0f}°)")
    ax.set_aspect("equal")
    ax.set_axis_off()
    path = RAW_DIR / f"shadows_{hhmm.replace(':', '')}.png"
    fig.savefig(path, dpi=110, bbox_inches="tight")
    plt.close(fig)
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--plot", metavar="HH:MM", choices=TIMES,
                        help="also save a shadow plot for this time to data/raw/")
    args = parser.parse_args()

    buildings = gpd.read_file(BUILDINGS_PATH).to_crs(METRIC_CRS)
    buildings["height_m"] = [building_height(row) for _, row in buildings.iterrows()]
    trees = gpd.read_file(TREES_PATH).to_crs(METRIC_CRS)
    if "leaf_type" not in trees.columns:
        trees["leaf_type"] = None

    edges, nodes = load_segments()
    edges_m = edges.set_geometry("geometry").to_crs(METRIC_CRS)
    points, segment = sample_points(edges_m)
    covered_segments = np.array([is_covered(row) for _, row in edges.iterrows()])
    covered_areas = load_covered_areas()

    print(f"segments: {len(edges)}  sample points: {len(points)}  "
          f"covered by OSM tag: {int(covered_segments.sum())}  "
          f"hand-labelled walkways: {len(covered_areas)}")

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    sun = {}
    for hhmm in TIMES:
        elevation, azimuth = sun_position(hhmm)
        sun[hhmm] = {"elevation_deg": round(elevation, 1), "azimuth_deg": round(azimuth, 1)}
        offset = shadow_offset_per_metre(elevation, azimuth)
        building_pieces = building_shadow_pieces(buildings, offset)
        tree_pieces = tree_shadow_pieces(trees, offset)
        fractions = segment_shade(points, segment, len(edges), covered_segments,
                                  covered_areas, building_pieces, tree_pieces)

        layer = {str(i): round(float(f), 2) for i, f in enumerate(fractions)}
        path = PROCESSED_DIR / f"shade_{hhmm.replace(':', '')}.json"
        _write_json(path, layer)

        lengths = edges["length"].to_numpy()
        print(f"{hhmm}  sun elev {elevation:5.1f}  az {azimuth:5.1f}  "
              f"shadow {1 / math.tan(math.radians(elevation)):.2f} m per m  "
              f"length-weighted shade {np.average(fractions, weights=lengths):.1%}  "
              f"segments >50% shaded {np.mean(fractions > 0.5):.1%}  -> {path.name}")

        if args.plot == hhmm:
            print("plot:", plot_layer(hhmm, buildings, building_pieces, tree_pieces,
                                      edges_m, fractions))

    write_graph(edges, nodes, sun)
    print(f"graph: {len(edges)} segments -> {PROCESSED_DIR / 'graph.json'}")


if __name__ == "__main__":
    main()
