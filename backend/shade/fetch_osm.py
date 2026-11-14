"""Download the demo-area map data from OpenStreetMap. Owner: Rohan.

Fetches the walking network, building footprints and trees for about
2 km x 2 km around ASU Tempe and Mill Ave, and caches them in data/raw/
(gitignored, never committed).

Run from the repo root:
    python -m backend.shade.fetch_osm
"""

from pathlib import Path

import osmnx as ox

# Centre of the demo area (ASU Tempe campus / Mill Ave) and half-width of the box.
CENTER = (33.4194, -111.9341)
DIST_M = 1000
# Buildings and trees just outside the box still cast shadows into it.
FEATURE_MARGIN_M = 150

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = REPO_ROOT / "data" / "raw"

GRAPH_PATH = RAW_DIR / "walk.graphml"
BUILDINGS_PATH = RAW_DIR / "buildings.geojson"
TREES_PATH = RAW_DIR / "trees.geojson"

# Way tags the shade model and route finder need on top of the OSMnx defaults.
EXTRA_WAY_TAGS = ["covered", "tunnel", "step_count", "indoor"]
BUILDING_COLUMNS = ["building", "height", "building:levels", "name"]
TREE_COLUMNS = ["natural", "genus", "species", "leaf_type", "diameter_crown", "height"]


def fetch_graph():
    ox.settings.useful_tags_way = list(
        dict.fromkeys([*ox.settings.useful_tags_way, *EXTRA_WAY_TAGS])
    )
    graph = ox.graph_from_point(
        CENTER, dist=DIST_M, dist_type="bbox", network_type="walk", simplify=False
    )
    # Keep stairs and covered stretches as their own segments instead of letting
    # simplification merge them into a longer edge with mixed tags.
    return ox.simplify_graph(graph, edge_attrs_differ=["highway", "covered", "tunnel"])


def _fetch_features(tags, columns, geom_types):
    gdf = ox.features_from_point(CENTER, tags=tags, dist=DIST_M + FEATURE_MARGIN_M)
    gdf = gdf[gdf.geometry.geom_type.isin(geom_types)]
    keep = [c for c in columns if c in gdf.columns]
    return gdf[[*keep, "geometry"]].reset_index()


def fetch_buildings():
    return _fetch_features({"building": True}, BUILDING_COLUMNS, ["Polygon", "MultiPolygon"])


def fetch_trees():
    return _fetch_features(
        {"natural": ["tree", "tree_row", "wood"]},
        TREE_COLUMNS,
        ["Point", "LineString", "Polygon", "MultiPolygon"],
    )


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    ox.settings.cache_folder = str(RAW_DIR / "cache")

    graph = fetch_graph()
    ox.save_graphml(graph, GRAPH_PATH)

    buildings = fetch_buildings()
    buildings.to_file(BUILDINGS_PATH, driver="GeoJSON")

    trees = fetch_trees()
    trees.to_file(TREES_PATH, driver="GeoJSON")

    print(f"nodes:     {graph.number_of_nodes()}")
    print(f"edges:     {graph.number_of_edges()}")
    print(f"buildings: {len(buildings)}")
    print(f"trees:     {len(trees)}")
    print(f"saved to   {RAW_DIR}")


if __name__ == "__main__":
    main()
