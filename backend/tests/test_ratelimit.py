from fastapi.testclient import TestClient

from backend.api import main
from backend.api.ratelimit import SlidingWindowLimiter
from backend.api.schemas import ParseResponse


def test_allows_up_to_limit_then_blocks():
    lim = SlidingWindowLimiter(limit=3, window_s=60)
    assert [lim.allow("a", now=t) for t in (0, 1, 2)] == [True, True, True]
    assert lim.allow("a", now=3) is False


def test_window_slides_and_keys_are_independent():
    lim = SlidingWindowLimiter(limit=1, window_s=10)
    assert lim.allow("a", now=0) is True
    assert lim.allow("a", now=5) is False
    assert lim.allow("b", now=5) is True  # another caller is unaffected
    assert lim.allow("a", now=10) is True  # window has passed


def test_parse_endpoint_returns_429_when_limit_is_hit(monkeypatch):
    monkeypatch.setattr(main, "_per_caller", SlidingWindowLimiter(limit=2, window_s=60))
    monkeypatch.setattr(main, "_overall", SlidingWindowLimiter(limit=100, window_s=60))
    monkeypatch.setattr(main.ai, "parse_request", lambda _req: ParseResponse())
    client = TestClient(main.app)
    body = {"text": "3 PM"}
    assert client.post("/parse", json=body).status_code == 200
    assert client.post("/parse", json=body).status_code == 200
    blocked = client.post("/parse", json=body)
    assert blocked.status_code == 429
    assert "Too many requests" in blocked.json()["detail"]


def test_overall_cap_applies_across_callers(monkeypatch):
    monkeypatch.setattr(main, "_per_caller", SlidingWindowLimiter(limit=100, window_s=60))
    monkeypatch.setattr(main, "_overall", SlidingWindowLimiter(limit=1, window_s=60))
    monkeypatch.setattr(main.ai, "parse_request", lambda _req: ParseResponse())
    client = TestClient(main.app)
    assert client.post("/parse", json={"text": "x"}, headers={"cf-connecting-ip": "1.1.1.1"}).status_code == 200
    assert client.post("/parse", json={"text": "x"}, headers={"cf-connecting-ip": "2.2.2.2"}).status_code == 429


def test_route_and_resources_are_not_rate_limited(monkeypatch):
    monkeypatch.setattr(main, "_overall", SlidingWindowLimiter(limit=0, window_s=60))
    client = TestClient(main.app)
    assert client.get("/resources", params={"lat": 33.4166, "lng": -111.934}).status_code == 200
