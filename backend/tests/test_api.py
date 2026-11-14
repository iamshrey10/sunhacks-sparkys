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


def test_unimplemented_endpoints_say_so_instead_of_faking():
    assert client.post("/route", json=ROUTE_BODY).status_code == 501
    assert client.get("/resources", params={"lat": 33.42, "lng": -111.93}).status_code == 501
    assert client.post("/parse", json={"text": "3 PM avoid stairs"}).status_code == 501


def test_validation_rejects_bad_time():
    bad = {**ROUTE_BODY, "depart_time": "25:99"}
    assert client.post("/route", json=bad).status_code == 422
