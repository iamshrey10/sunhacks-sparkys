"""Route finder tests. They run against the committed data in data/processed/."""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.api.main import app
from backend.api.schemas import RouteRequest
from backend.routing.engine import (
    WALK_SPEED_MPS, compute_routes, load_graph, load_shade, nearest_layer,
)

client = TestClient(app)

# Student Pavilion to Mill Ave and University.
START = {"lat": 33.4190, "lng": -111.9330}
END = {"lat": 33.4217, "lng": -111.9400}


def route(depart_time="15:00", **prefs):
    return compute_routes(
        RouteRequest(start=START, end=END, depart_time=depart_time, prefs=prefs)
    )


def test_demo_trip_gives_two_different_routes_and_coolest_is_shadier():
    r = route("15:00")
    assert r.fastest.kind == "fastest" and r.coolest.kind == "coolest"
    assert r.fastest.geometry != r.coolest.geometry
    assert r.coolest.shade_pct > r.fastest.shade_pct
    assert r.source == "model"


@pytest.mark.parametrize("depart_time", ["06:00", "09:00", "12:00", "13:00", "15:00", "18:00", "19:00"])
@pytest.mark.parametrize("sensitivity", ["low", "normal", "high"])
def test_coolest_never_has_more_sun_and_fastest_is_never_longer(depart_time, sensitivity):
    r = route(depart_time, heat_sensitivity=sensitivity)
    assert r.fastest.distance_m <= r.coolest.distance_m
    assert r.coolest.sun_exposed_s <= r.fastest.sun_exposed_s
    assert r.coolest.shade_pct >= r.fastest.shade_pct


def test_numbers_are_consistent_with_each_other():
    for option in (route().fastest, route().coolest):
        assert option.duration_s == pytest.approx(option.distance_m / WALK_SPEED_MPS, abs=0.1)
        expected_sun = option.duration_s * (1 - option.shade_pct / 100)
        assert option.sun_exposed_s == pytest.approx(expected_sun, rel=0.01)
        # The trip is about 720 m in a straight line.
        assert 720 < option.distance_m < 2000


def test_route_starts_and_ends_near_the_requested_points():
    for option in (route().fastest, route().coolest):
        first, last = option.geometry[0], option.geometry[-1]
        assert first == pytest.approx((START["lat"], START["lng"]), abs=0.0005)
        assert last == pytest.approx((END["lat"], END["lng"]), abs=0.0005)


def test_zero_shade_weight_makes_coolest_equal_fastest():
    r = route(shade_weight=0)
    assert r.coolest.geometry == r.fastest.geometry


def test_higher_heat_sensitivity_never_increases_sun_exposure():
    exposure = [route("09:00", heat_sensitivity=s).coolest.sun_exposed_s
                for s in ("low", "normal", "high")]
    assert exposure[0] >= exposure[1] >= exposure[2]


def test_avoid_stairs_removes_stairs():
    # At 18:00 the coolest route uses a flight of stairs unless told not to.
    assert route("18:00").coolest.stairs_count >= 1
    r = route("18:00", avoid_stairs=True)
    assert r.fastest.stairs_count == 0
    assert r.coolest.stairs_count == 0


@pytest.mark.parametrize(
    "depart_time, layer",
    [("00:00", "06:00"), ("09:00", "09:00"), ("10:29", "10:00"), ("10:30", "10:00"),
     ("10:31", "11:00"), ("13:20", "13:00"), ("16:40", "17:00"), ("23:59", "19:00")],
)
def test_depart_time_snaps_to_nearest_layer(depart_time, layer):
    assert nearest_layer(depart_time) == layer


def test_response_reports_the_layer_used():
    r = route("16:40")
    assert r.depart_time == "16:40"
    assert r.shade_layer == "17:00"


def test_there_is_one_shade_layer_per_daylight_hour():
    layers = load_graph().layers
    assert layers == [f"{hour:02d}:00" for hour in range(6, 20)]
    for layer in layers:
        shade = load_shade(layer)
        assert len(shade) == len(load_graph().edges)
        assert all(0 <= value <= 1 for value in shade)


def test_shadows_are_longest_when_the_sun_is_low():
    def mean_shade(layer):
        shade = load_shade(layer)
        return sum(shade) / len(shade)

    assert mean_shade("07:00") > mean_shade("09:00") > mean_shade("12:00")
    assert mean_shade("18:00") > mean_shade("16:00") > mean_shade("13:00")


def test_route_starts_at_the_nearest_point_on_a_path_not_a_junction():
    graph = load_graph()
    # Halfway along the longest segment, far from either of its junctions.
    u, v, length, _steps, coords = max(graph.edges, key=lambda edge: edge[2])
    lat, lng = coords[len(coords) // 2]
    option = compute_routes(RouteRequest(start={"lat": lat, "lng": lng}, end=END)).fastest
    assert option.geometry[0] == pytest.approx((lat, lng), abs=0.00002)
    assert option.geometry[0] not in (graph.nodes[u], graph.nodes[v])


def test_two_points_on_the_same_segment_walk_straight_between_them():
    graph = load_graph()
    _u, _v, length, _steps, coords = max(graph.edges, key=lambda edge: edge[2])
    a, b = coords[0], coords[-1]
    near_start = {"lat": a[0] + 0.25 * (b[0] - a[0]), "lng": a[1] + 0.25 * (b[1] - a[1])}
    near_end = {"lat": a[0] + 0.75 * (b[0] - a[0]), "lng": a[1] + 0.75 * (b[1] - a[1])}
    option = compute_routes(RouteRequest(start=near_start, end=near_end)).fastest
    assert 0 < option.distance_m < length


def test_same_start_and_end_is_an_empty_walk():
    r = compute_routes(RouteRequest(start=START, end=START))
    assert r.fastest.distance_m == 0
    assert r.coolest.distance_m == 0


def test_point_outside_the_mapped_area_is_rejected():
    downtown_phoenix = {"lat": 33.4484, "lng": -112.0740}
    with pytest.raises(HTTPException) as error:
        compute_routes(RouteRequest(start=START, end=downtown_phoenix))
    assert error.value.status_code == 422


def test_route_endpoint_returns_model_output():
    body = {"start": START, "end": END, "depart_time": "15:00",
            "prefs": {"avoid_stairs": True, "heat_sensitivity": "high", "shade_weight": 0.7}}
    response = client.post("/route", json=body)
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "model"
    assert data["shade_layer"] == "15:00"
    assert data["coolest"]["shade_pct"] > data["fastest"]["shade_pct"]
    assert data["coolest"]["stairs_count"] == 0
