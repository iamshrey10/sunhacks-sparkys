from datetime import datetime
from zoneinfo import ZoneInfo

from backend.api.schemas import LatLng
from backend.resources.service import get_resources, open_now

PHX = ZoneInfo("America/Phoenix")
MEMORIAL_UNION = LatLng(lat=33.4166, lng=-111.9340)

SITE = {
    "season": {"start": "05-01", "end": "09-30"},
    "weekly": {"mon": [["08:00", "21:00"]], "sat": [["10:00", "17:00"]]},
}


def at(y, m, d, hh, mm=0):
    return datetime(y, m, d, hh, mm, tzinfo=PHX)


def test_open_during_listed_hours_in_season():
    assert open_now(SITE, at(2026, 7, 6, 12)) is True  # Monday noon


def test_closed_outside_listed_hours_in_season():
    assert open_now(SITE, at(2026, 7, 6, 22)) is False  # Monday 10 PM


def test_unknown_outside_season():
    assert open_now(SITE, at(2026, 11, 9, 12)) is None  # Monday in November


def test_unknown_when_day_not_listed():
    assert open_now(SITE, at(2026, 7, 7, 12)) is None  # Tuesday not listed


def test_unknown_when_stale():
    assert open_now({**SITE, "stale": True}, at(2026, 7, 6, 12)) is None


def test_results_sorted_by_distance_and_within_radius():
    res = get_resources(MEMORIAL_UNION, 1500, now=at(2026, 7, 6, 12)).resources
    assert res, "expected resources near Memorial Union"
    dists = [r.distance_m for r in res]
    assert dists == sorted(dists)
    assert all(d <= 1500 for d in dists)


def test_openstreetmap_items_never_claim_open_or_closed():
    res = get_resources(MEMORIAL_UNION, 2500, now=at(2026, 7, 6, 12)).resources
    osm = [r for r in res if r.id.startswith("osm-")]
    assert osm and all(r.open_now is None for r in osm)


def test_curated_sites_carry_a_source_and_check_date():
    res = get_resources(MEMORIAL_UNION, 5000, now=at(2026, 7, 6, 12)).resources
    curated = [r for r in res if r.id.startswith("tempe-")]
    assert curated
    assert all(r.source_url and r.last_checked for r in curated)


def test_all_unknown_in_november_for_seasonal_sites():
    res = get_resources(MEMORIAL_UNION, 5000, now=at(2026, 11, 14, 12)).resources
    assert all(r.open_now is None for r in res if r.id.startswith("tempe-"))
