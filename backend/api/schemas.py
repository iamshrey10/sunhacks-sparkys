"""Shared API contract. Every module and the frontend types mirror these models.

Change this file only through a pull request that also updates
docs/API_CONTRACT.md and frontend/src/types.ts.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# Tempe uses America/Phoenix (no daylight saving). All times are local, "HH:MM".
TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"


class LatLng(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class Prefs(BaseModel):
    avoid_stairs: bool = False
    heat_sensitivity: Literal["low", "normal", "high"] = "normal"
    # 0 = fastest route, 1 = coolest route regardless of length.
    shade_weight: float = Field(default=0.7, ge=0, le=1)


class RouteRequest(BaseModel):
    start: LatLng
    end: LatLng
    depart_time: str = Field(default="15:00", pattern=TIME_PATTERN)
    prefs: Prefs = Field(default_factory=Prefs)


class RouteOption(BaseModel):
    kind: Literal["fastest", "coolest"]
    # [lat, lng] pairs in walking order.
    geometry: list[tuple[float, float]]
    distance_m: float = Field(ge=0)
    duration_s: float = Field(ge=0)
    # Share of the route length estimated to be in shade, 0-100.
    shade_pct: float = Field(ge=0, le=100)
    # Estimated seconds spent walking in direct sun.
    sun_exposed_s: float = Field(ge=0)
    stairs_count: int = Field(default=0, ge=0)


class RouteResponse(BaseModel):
    fastest: RouteOption
    coolest: RouteOption
    depart_time: str = Field(pattern=TIME_PATTERN)
    # Which precomputed shade layer was used, e.g. "15:00".
    shade_layer: str
    # "model" for real computed output. "sample" must never be returned by the API.
    source: Literal["model"] = "model"


Maneuver = Literal[
    "depart", "continue", "slight_left", "slight_right", "left", "right",
    "sharp_left", "sharp_right", "u_turn", "stairs", "arrive",
]


class DirectionStep(BaseModel):
    """One instruction of a turn-by-turn walk. Built from the route, never guessed."""

    instruction: str
    maneuver: Maneuver
    # OpenStreetMap street name, None where the path has no name.
    street: str | None = None
    # Where this step begins.
    location: LatLng
    # Distance walked before this step begins, in metres.
    start_along_m: float = Field(ge=0)
    distance_m: float = Field(ge=0)
    duration_s: float = Field(ge=0)
    # Share of this step estimated to be in shade, 0-100.
    shade_pct: float = Field(ge=0, le=100)
    stairs: bool = False


PlaceGroup = Literal["food", "cafe", "drinks", "sight"]


class NearbyPlace(BaseModel):
    """A restaurant, cafe, bar or sight from OpenStreetMap."""

    id: str
    name: str
    group: PlaceGroup
    # OpenStreetMap tag value, e.g. "restaurant", "museum".
    kind: str
    location: LatLng
    # Unverified OpenStreetMap text. Never show it as "open now".
    listed_hours: str | None = None
    source_url: str
    # Straight-line distance: from the route (in /directions) or from you (in /track).
    distance_m: float = Field(ge=0)
    # How far along the route the nearest point is.
    along_route_m: float = Field(ge=0)
    # Only in /track: True if that point is still ahead of you on the route.
    ahead: bool | None = None


class DirectionsRequest(BaseModel):
    route: RouteRequest
    kind: Literal["fastest", "coolest"] = "coolest"


class DirectionsResponse(BaseModel):
    kind: Literal["fastest", "coolest"]
    steps: list[DirectionStep]
    distance_m: float = Field(ge=0)
    duration_s: float = Field(ge=0)
    # Places within about 75 m of the route, in walking order.
    places: list[NearbyPlace]
    shade_layer: str


class TrackRequest(BaseModel):
    # The route being walked: RouteOption.geometry, [lat, lng] pairs.
    geometry: list[tuple[float, float]] = Field(min_length=2, max_length=2000)
    position: LatLng
    # progress_m from the previous call; stops a route that doubles back matching early.
    last_progress_m: float | None = Field(default=None, ge=0)
    radius_m: int = Field(default=120, ge=20, le=500)


class TrackResponse(BaseModel):
    progress_m: float = Field(ge=0)
    remaining_m: float = Field(ge=0)
    remaining_s: float = Field(ge=0)
    distance_from_route_m: float = Field(ge=0)
    # True when you are more than 35 m from the route: ask /route again from here.
    off_route: bool
    arrived: bool
    # Places within radius_m of you, nearest first (at most 8).
    nearby: list[NearbyPlace]


ResourceKind = Literal["water", "cooling_center", "library", "transit", "other"]


class Resource(BaseModel):
    id: str
    name: str
    kind: ResourceKind
    location: LatLng
    address: str | None = None
    # None means unknown. Never guess.
    open_now: bool | None = None
    hours_text: str | None = None
    source_url: str | None = None
    # When the open/closed status was last verified.
    last_checked: datetime | None = None
    distance_m: float | None = Field(default=None, ge=0)


class ResourcesResponse(BaseModel):
    resources: list[Resource]
    generated_at: datetime


class ParseRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class ParseResponse(BaseModel):
    depart_time: str | None = Field(default=None, pattern=TIME_PATTERN)
    destination_text: str | None = None
    prefs: Prefs = Field(default_factory=Prefs)


class ExplainRequest(BaseModel):
    route: RouteResponse
    prefs: Prefs = Field(default_factory=Prefs)


class ExplainResponse(BaseModel):
    text: str


class Health(BaseModel):
    status: Literal["ok"] = "ok"
    gemini_configured: bool
    tinyfish_configured: bool
