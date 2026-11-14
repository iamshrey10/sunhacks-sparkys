import pytest
from fastapi.testclient import TestClient

from backend.api.main import app

client = TestClient(app)

ROUTE_BODY = {
    "start": {"lat": 33.4190, "lng": -111.9330},
    "end": {"lat": 33.4217, "lng": -111.9400},
    "depart_time": "15:00",
}


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_parse_and_explain_validate_input():
    assert client.post("/parse", json={"text": ""}).status_code == 422
    assert client.post("/explain", json={}).status_code == 422


def test_upstream_failure_becomes_502(monkeypatch):
    from backend.ai import service as ai
    from backend.api.errors import UpstreamError

    def boom(_req):
        raise UpstreamError("Gemini is unavailable")

    monkeypatch.setattr(ai, "parse_request", boom)
    r = client.post("/parse", json={"text": "3 PM avoid stairs"})
    assert r.status_code == 502
    assert r.json()["detail"] == "Gemini is unavailable"


def test_resources_returns_sourced_items_sorted_by_distance():
    r = client.get("/resources", params={"lat": 33.4166, "lng": -111.9340, "radius_m": 1500})
    assert r.status_code == 200
    items = r.json()["resources"]
    assert items
    assert [i["distance_m"] for i in items] == sorted(i["distance_m"] for i in items)
    assert all(i["source_url"] for i in items)


def test_validation_rejects_bad_time():
    bad = {**ROUTE_BODY, "depart_time": "25:99"}
    assert client.post("/route", json=bad).status_code == 422


def test_directions_returns_steps_and_places():
    body = {"route": ROUTE_BODY, "kind": "coolest"}
    r = client.post("/directions", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["kind"] == "coolest"
    assert data["steps"][0]["maneuver"] == "depart"
    assert data["steps"][-1]["maneuver"] == "arrive"
    assert data["places"]
    route = client.post("/route", json=ROUTE_BODY).json()["coolest"]
    assert abs(data["distance_m"] - route["distance_m"]) < 0.5


def test_directions_outside_the_map_is_422():
    far = {**ROUTE_BODY, "end": {"lat": 33.4484, "lng": -112.0740}}
    assert client.post("/directions", json={"route": far}).status_code == 422


def test_track_follows_a_walker_and_lists_nearby_places():
    route = client.post("/route", json=ROUTE_BODY).json()["coolest"]
    geometry = route["geometry"]
    midpoint = geometry[len(geometry) // 2]
    r = client.post(
        "/track",
        json={"geometry": geometry, "position": {"lat": midpoint[0], "lng": midpoint[1]}},
    )
    assert r.status_code == 200
    data = r.json()
    assert 0 < data["progress_m"] < route["distance_m"]
    assert data["remaining_m"] == pytest.approx(route["distance_m"] - data["progress_m"], abs=1)
    assert data["off_route"] is False and data["arrived"] is False
    assert all(p["ahead"] in (True, False) for p in data["nearby"])


def test_track_validates_input():
    assert client.post("/track", json={"geometry": [[33.4, -111.9]], "position": {"lat": 33.4, "lng": -111.9}}).status_code == 422
    assert client.post("/track", json={"geometry": [[33.4, -111.9], [33.5, -111.9]]}).status_code == 422
