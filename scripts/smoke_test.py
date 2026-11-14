"""Smoke test a running Cool Route API: one request per endpoint, PASS or FAIL each.

Run from the repo root:
    .venv\\Scripts\\python scripts\\smoke_test.py http://localhost:8000
    python scripts/smoke_test.py https://<deployed-api-url>

Makes 2 Gemini calls (/parse and /explain). Exits 1 if any check fails.
"""

import json
import sys
from pathlib import Path

import httpx

MEMORIAL_UNION = {"lat": 33.4166, "lng": -111.9340}
TEMPE_BEACH_PARK = {"lat": 33.4300, "lng": -111.9440}
# The coolest route must beat the fastest by at least this many shade points.
MIN_SHADE_GAIN_PCT = 10
SAMPLE_ROUTE = Path(__file__).resolve().parents[1] / "docs/samples/route_response.sample.json"


def check_health(api: httpx.Client, _: dict) -> str:
    body = api.get("/health").raise_for_status().json()
    assert body["status"] == "ok", f"status is {body['status']!r}"
    assert body["gemini_configured"], "gemini_configured is false"
    return f"tinyfish_configured={body['tinyfish_configured']}"


def check_route(api: httpx.Client, shared: dict) -> str:
    body = api.post(
        "/route",
        json={"start": MEMORIAL_UNION, "end": TEMPE_BEACH_PARK, "depart_time": "15:00"},
    ).raise_for_status().json()
    shared["route"] = body
    fast, cool = body["fastest"]["shade_pct"], body["coolest"]["shade_pct"]
    detail = f"fastest {fast:.0f}% shade, coolest {cool:.0f}%"
    assert cool >= fast + MIN_SHADE_GAIN_PCT, f"{detail}; need a gain of {MIN_SHADE_GAIN_PCT}+"
    return f"{detail}, shade layer {body['shade_layer']}"


def check_resources(api: httpx.Client, _: dict) -> str:
    params = {**MEMORIAL_UNION, "radius_m": 1500}
    resources = api.get("/resources", params=params).raise_for_status().json()["resources"]
    assert resources, "no resources returned"
    return f"{len(resources)} found, nearest: {resources[0]['name']}"


def check_parse(api: httpx.Client, _: dict) -> str:
    body = api.post(
        "/parse", json={"text": "I'm 78, leave at 3 PM, avoid stairs"}
    ).raise_for_status().json()
    got = (body["depart_time"], body["prefs"]["avoid_stairs"], body["prefs"]["heat_sensitivity"])
    assert got == ("15:00", True, "high"), f"got {got}, want ('15:00', True, 'high')"
    return f"depart {got[0]}, avoid_stairs {got[1]}, heat {got[2]}"


def check_explain(api: httpx.Client, shared: dict) -> str:
    # Explain the route from /route; fall back to the sample so this still runs if it failed.
    route = shared.get("route") or json.loads(SAMPLE_ROUTE.read_text())
    text = api.post("/explain", json={"route": route, "prefs": {}}).raise_for_status().json()["text"]
    assert text.strip().endswith((".", "!", "?")), f"not a complete sentence: {text!r}"
    source = "the /route result" if "route" in shared else "the docs sample (/route failed)"
    return f"explained {source}: {text}"


CHECKS = [
    ("/health", check_health),
    ("/route", check_route),
    ("/resources", check_resources),
    ("/parse", check_parse),
    ("/explain", check_explain),
]


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python scripts/smoke_test.py <base-url>")
        return 2
    base_url = sys.argv[1].rstrip("/")
    print(f"Smoke testing {base_url}\n")

    shared: dict = {}
    failed = 0
    # Generous timeout: the deployed API may cold-start, and Gemini can be slow.
    with httpx.Client(base_url=base_url, timeout=30) as api:
        for name, check in CHECKS:
            try:
                print(f"PASS  {name:<11} {check(api, shared)}")
            except AssertionError as exc:
                failed += 1
                print(f"FAIL  {name:<11} {exc}")
            except httpx.HTTPStatusError as exc:
                failed += 1
                detail = exc.response.text[:200]
                print(f"FAIL  {name:<11} HTTP {exc.response.status_code}: {detail}")
            except (httpx.HTTPError, KeyError, ValueError) as exc:
                failed += 1
                print(f"FAIL  {name:<11} {type(exc).__name__}: {exc}")

    print(f"\n{len(CHECKS) - failed}/{len(CHECKS)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
