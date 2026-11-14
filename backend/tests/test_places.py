"""Places-along-a-route tests. They run against data/processed/places.json."""

from backend.api.schemas import RouteRequest
from backend.routing.engine import compute_routes
from backend.routing.places import GROUPS, load_places, places_along

# Student Pavilion to Mill Ave and University.
START = {"lat": 33.4190, "lng": -111.9330}
END = {"lat": 33.4217, "lng": -111.9400}


def demo_route():
    return compute_routes(RouteRequest(start=START, end=END, depart_time="15:00")).fastest


def test_stored_places_are_named_sourced_and_inside_the_demo_area():
    places = load_places()
    assert len(places) > 50
    for place in places:
        assert place["name"]
        assert place["group"] in GROUPS
        assert place["source_url"].startswith("https://www.openstreetmap.org/")
        assert 33.40 < place["lat"] < 33.44
        assert -111.96 < place["lng"] < -111.91


def test_places_are_close_to_the_route_and_in_walking_order():
    route = demo_route()
    found = places_along(route.geometry, max_distance_m=75)
    assert found
    assert all(p["distance_from_route_m"] <= 75 for p in found)
    assert all(0 <= p["along_route_m"] <= route.distance_m + 1 for p in found)
    along = [p["along_route_m"] for p in found]
    assert along == sorted(along)


def test_a_wider_search_finds_at_least_as_many_places():
    geometry = demo_route().geometry
    narrow = {p["id"] for p in places_along(geometry, max_distance_m=30)}
    wide = {p["id"] for p in places_along(geometry, max_distance_m=150)}
    assert narrow <= wide
    assert len(wide) > len(narrow)


def test_group_filter_and_limit():
    geometry = demo_route().geometry
    food = places_along(geometry, max_distance_m=150, groups=("food",))
    assert food and all(p["group"] == "food" for p in food)
    assert len(places_along(geometry, max_distance_m=150, limit=3)) == 3


def test_each_place_is_listed_once():
    found = places_along(demo_route().geometry, max_distance_m=150)
    keys = [(p["group"], p["name"]) for p in found]
    assert len(keys) == len(set(keys))


def test_a_place_on_the_route_is_found_at_the_right_spot():
    place = load_places()[0]
    # A short walk that passes straight through the place, 100 m either side.
    step = 0.0009
    geometry = [(place["lat"] - step, place["lng"]), (place["lat"] + step, place["lng"])]
    match = next(p for p in places_along(geometry) if p["id"] == place["id"])
    assert match["distance_from_route_m"] < 1
    assert 95 < match["along_route_m"] < 105


def test_empty_or_single_point_route_has_no_places():
    assert places_along([]) == []
    assert places_along([(33.4190, -111.9330)]) == []
