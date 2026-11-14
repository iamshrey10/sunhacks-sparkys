"""Nearby water and cooling resources. Owner: Shreyas.

Data lives in data/resources/ and is refreshed offline (scripts/), so a request
never depends on a live website. Unknown stays None. Never guess.

- curated.json: official heat-relief sites with structured hours and a season.
- osm_resources.json: OpenStreetMap drinking water and libraries (no hours known).
"""

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from backend.api.schemas import LatLng, Resource, ResourcesResponse

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "resources"
PHOENIX = ZoneInfo("America/Phoenix")  # Tempe: no daylight saving
DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
EARTH_RADIUS_M = 6_371_000


def _load(name: str) -> dict:
    path = DATA_DIR / name
    if not path.exists():
        return {}
    return json.loads(path.read_text())


def distance_m(a: LatLng, lat: float, lng: float) -> float:
    p1, p2 = math.radians(a.lat), math.radians(lat)
    dphi = p2 - p1
    dlmb = math.radians(lng - a.lng)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(h))


def _in_season(local: datetime, season: dict | None) -> bool:
    if not season:
        return True
    md = local.strftime("%m-%d")
    return season["start"] <= md <= season["end"]


def open_now(site: dict, now: datetime) -> bool | None:
    """True/False only when we have sourced hours for today and the site is in season.

    Returns None when the listing is stale, outside its season, or today's hours
    are not listed. None is shown to users as "hours unknown".
    """
    if site.get("stale"):
        return None
    local = now.astimezone(PHOENIX)
    if not _in_season(local, site.get("season")):
        return None
    today = (site.get("weekly") or {}).get(DAYS[local.weekday()])
    if today is None:
        return None
    hhmm = local.strftime("%H:%M")
    return any(start <= hhmm < end for start, end in today)


def _curated(now: datetime) -> list[tuple[Resource, float, float]]:
    out = []
    for s in _load("curated.json").get("sites", []):
        checked = s.get("last_checked")
        out.append(
            (
                Resource(
                    id=s["id"],
                    name=s["name"],
                    kind=s["kind"],
                    location=LatLng(lat=s["lat"], lng=s["lng"]),
                    address=s.get("address"),
                    open_now=open_now(s, now),
                    hours_text=s.get("hours_text"),
                    source_url=s.get("source_url"),
                    last_checked=datetime.fromisoformat(checked) if checked else None,
                ),
                s["lat"],
                s["lng"],
            )
        )
    return out


def _osm() -> list[tuple[Resource, float, float]]:
    data = _load("osm_resources.json")
    fetched = data.get("fetched_at")
    out = []
    for e in data.get("elements", []):
        kind = "library" if e["amenity"] == "library" else "water"
        default = "Library" if kind == "library" else "Drinking water"
        out.append(
            (
                Resource(
                    id=f"osm-{e['type']}-{e['id']}",
                    name=e.get("name") or f"{default} (OpenStreetMap)",
                    kind=kind,
                    location=LatLng(lat=e["lat"], lng=e["lng"]),
                    open_now=None,  # OSM does not tell us whether it is usable right now
                    hours_text=e.get("opening_hours"),
                    source_url=f"https://www.openstreetmap.org/{e['type']}/{e['id']}",
                    last_checked=datetime.fromisoformat(fetched) if fetched else None,
                ),
                e["lat"],
                e["lng"],
            )
        )
    return out


def get_resources(
    center: LatLng, radius_m: int = 1500, now: datetime | None = None
) -> ResourcesResponse:
    now = now or datetime.now(timezone.utc)
    found = []
    for res, lat, lng in _curated(now) + _osm():
        d = distance_m(center, lat, lng)
        if d <= radius_m:
            found.append(res.model_copy(update={"distance_m": round(d)}))
    found.sort(key=lambda r: r.distance_m)
    return ResourcesResponse(resources=found, generated_at=now)
