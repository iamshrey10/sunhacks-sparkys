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
