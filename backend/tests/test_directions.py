"""Directions and live-tracking tests. They run against data/processed/."""

import pytest

from backend.api.schemas import RouteRequest
from backend.routing.directions import build_steps, compute_directions, _Segment
from backend.routing.engine import WALK_SPEED_MPS, compute_routes
from backend.routing.geo import Frame, cumulative_lengths
from backend.routing.tracking import ARRIVED_M, OFF_ROUTE_M, track

# Student Pavilion to Mill Ave and University.
START = {"lat": 33.4190, "lng": -111.9330}
END = {"lat": 33.4217, "lng": -111.9400}


def request(depart_time="15:00", **prefs):
    return RouteRequest(start=START, end=END, depart_time=depart_time, prefs=prefs)


@pytest.mark.parametrize("kind", ["fastest", "coolest"])
def test_directions_match_the_route_the_map_shows(kind):
    route = getattr(compute_routes(request()), kind)
    directions = compute_directions(request(), kind)
    assert directions.distance_m == pytest.approx(route.distance_m, abs=0.2)
    assert directions.duration_s == pytest.approx(route.duration_s, abs=0.5)
    assert [tuple(p) for p in directions.geometry] == [tuple(p) for p in route.geometry]


def test_steps_start_with_depart_and_end_with_arrive():
    steps = compute_directions(request()).steps
    assert steps[0].maneuver == "depart"
    assert steps[0].instruction.startswith("Head ")
    assert steps[-1].maneuver == "arrive"
    assert steps[-1].distance_m == 0


def test_steps_add_up_to_the_route():
    directions = compute_directions(request())
    walking = directions.steps[:-1]
    assert sum(s.distance_m for s in walking) == pytest.approx(directions.distance_m, abs=1.0)
    assert sum(s.duration_s for s in walking) == pytest.approx(directions.duration_s, abs=1.0)
    starts = [s.start_along_m for s in directions.steps]
    assert starts == sorted(starts) and starts[0] == 0
    # Each step begins where the previous one ended.
    for a, b in zip(walking, walking[1:]):
        assert a.start_along_m + a.distance_m == pytest.approx(b.start_along_m, abs=0.2)


def test_every_step_has_a_valid_shade_and_text():
    for step in compute_directions(request()).steps:
        assert step.instruction
        assert 0 <= step.shade_pct <= 100
        assert step.distance_m >= 0


def test_route_shade_is_the_length_weighted_shade_of_its_steps():
    route = compute_routes(request()).coolest
    steps = compute_directions(request(), "coolest").steps[:-1]
    weighted = sum(s.distance_m * s.shade_pct for s in steps) / sum(s.distance_m for s in steps)
    assert weighted == pytest.approx(route.shade_pct, abs=0.5)


def test_street_names_come_from_the_map():
    streets = {s.street for s in compute_directions(request()).steps if s.street}
    assert streets  # the demo walk passes named malls and avenues
    assert "South Mill Avenue" in streets


def test_a_route_with_stairs_has_a_stairs_step():
    # At 18:00 the coolest route climbs a flight of stairs unless told not to.
    with_stairs = compute_directions(request("18:00"), "coolest")
    assert any(s.stairs and s.maneuver == "stairs" for s in with_stairs.steps)
    assert with_stairs.steps and any("stairs" in s.instruction for s in with_stairs.steps if s.stairs)
    without = compute_directions(request("18:00", avoid_stairs=True), "coolest")
    assert not any(s.stairs for s in without.steps)


def test_same_start_and_end_is_just_arrival():
    directions = compute_directions(RouteRequest(start=START, end=START))
    assert [s.maneuver for s in directions.steps][-1] == "arrive"
    assert directions.distance_m == 0


# ---- instructions on a hand-made route (no map data involved) ----

def straight_then_turn(turn: str):
    """East for 40 m, then 40 m north (left) or south (right)."""
    frame = Frame(33.42)
    lat, lng = 33.42, -111.93
    east = (lat, lng + 40 / frame.k_lng)
    dlat = 40 / frame.k_lat * (1 if turn == "left" else -1)
    end = (east[0] + dlat, east[1])
    segments = [_Segment(40, None, False, 0.0), _Segment(40, None, False, 0.0)]
    return build_steps([(lat, lng), east, end], segments)


@pytest.mark.parametrize("turn", ["left", "right"])
def test_a_right_angle_is_a_turn_in_the_right_direction(turn):
    steps = straight_then_turn(turn)
    assert [s.maneuver for s in steps] == ["depart", turn, "arrive"]
    assert steps[0].instruction == "Head east"
    assert steps[1].instruction == f"Turn {turn}"
    assert steps[1].start_along_m == pytest.approx(40, abs=0.5)


def test_a_straight_line_has_no_turns():
    frame = Frame(33.42)
    points = [(33.42 + i * 20 / frame.k_lat, -111.93) for i in range(4)]
    steps = build_steps(points, [_Segment(20, None, False, 1.0)] * 3)
    assert [s.maneuver for s in steps] == ["depart", "arrive"]
    assert steps[0].instruction == "Head north"
    assert steps[0].shade_pct == 100


# ---- live tracking ----

def walk_to(geometry, metres):
    """The point `metres` along a geometry."""
    frame = Frame(geometry[0][0])
    cumulative = cumulative_lengths([frame.xy(*p) for p in geometry])
    for i in range(len(cumulative) - 1):
        if cumulative[i + 1] >= metres:
            t = (metres - cumulative[i]) / (cumulative[i + 1] - cumulative[i])
            a, b = geometry[i], geometry[i + 1]
            return a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])
    return geometry[-1]


@pytest.fixture(scope="module")
def route():
    return compute_routes(request()).coolest


def test_progress_follows_a_walker_along_the_route(route):
    last = None
    for walked in range(0, int(route.distance_m) - 60, 100):
        update = track(route.geometry, walk_to(route.geometry, walked), last)
        assert update.progress_m == pytest.approx(walked, abs=1.0)
        assert update.remaining_m == pytest.approx(route.distance_m - walked, abs=2.0)
        assert update.remaining_s == pytest.approx(update.remaining_m / WALK_SPEED_MPS, abs=1.0)
        assert not update.off_route and not update.arrived
        last = update.progress_m


def test_arriving_at_the_end(route):
    update = track(route.geometry, route.geometry[-1])
    assert update.arrived and not update.off_route
    assert update.remaining_m == 0 and update.remaining_s == 0
    assert track(route.geometry, walk_to(route.geometry, route.distance_m - ARRIVED_M - 15)).arrived is False


def test_leaving_the_route_is_detected(route):
    frame = Frame(route.geometry[0][0])
    lat, lng = walk_to(route.geometry, 300)
    # Clearly off the map of this walk: 100 m north of its northernmost point.
    far_north = max(p[0] for p in route.geometry) + 100 / frame.k_lat
    update = track(route.geometry, (far_north, lng))
    assert update.off_route and not update.arrived
    assert update.distance_from_route_m > OFF_ROUTE_M
    # A few metres of GPS error is not "off route".
    assert not track(route.geometry, (lat + 5 / frame.k_lat, lng)).off_route


def test_progress_never_goes_backwards_on_gps_noise(route):
    ahead = track(route.geometry, walk_to(route.geometry, 400))
    jitter = track(route.geometry, walk_to(route.geometry, 392), ahead.progress_m)
    assert jitter.progress_m >= ahead.progress_m


def test_a_route_that_doubles_back_is_not_matched_to_the_first_pass():
    frame = Frame(33.42)
    one_way = 200 / frame.k_lat
    # North 200 m, then back south along the same line.
    geometry = [(33.42, -111.93), (33.42 + one_way, -111.93), (33.42, -111.93 + 1e-6)]
    start = (33.42 + 50 / frame.k_lat, -111.93)
    assert track(geometry, start).progress_m == pytest.approx(50, abs=1)
    # Already 250 m in: the same spot now means the walk back, not the way out.
    assert track(geometry, start, last_progress_m=250).progress_m == pytest.approx(350, abs=1)


def test_nearby_places_are_close_sorted_and_marked_ahead_or_behind(route):
    # Near the end of the walk, where the restaurants are.
    position = walk_to(route.geometry, 900)
    update = track(route.geometry, position, last_progress_m=900, radius_m=150)
    assert update.nearby
    distances = [n.distance_m for n in update.nearby]
    assert distances == sorted(distances)
    assert all(d <= 150 for d in distances)
    assert len({(n.place["group"], n.place["name"]) for n in update.nearby}) == len(update.nearby)
    for item in update.nearby:
        assert item.ahead == (item.along_route_m >= update.progress_m)
    assert {True, False} >= {n.ahead for n in update.nearby}


def test_a_bigger_radius_finds_at_least_as_many_places(route):
    position = walk_to(route.geometry, 700)
    small = {n.place["id"] for n in track(route.geometry, position, radius_m=40).nearby}
    large = {n.place["id"] for n in track(route.geometry, position, radius_m=200).nearby}
    assert small <= large


def test_a_route_needs_two_points():
    with pytest.raises(ValueError):
        track([(33.42, -111.93)], (33.42, -111.93))
