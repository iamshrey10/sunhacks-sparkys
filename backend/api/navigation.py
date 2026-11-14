"""Directions and live tracking: maps the routing module's results onto the API models."""

from backend.api.schemas import (
    DirectionsRequest,
    DirectionsResponse,
    DirectionStep,
    LatLng,
    NearbyPlace,
    TrackRequest,
    TrackResponse,
)
from backend.routing.directions import compute_directions
from backend.routing.places import places_along
from backend.routing.tracking import track


def _place(place: dict, distance_m: float, along_route_m: float, ahead: bool | None = None) -> NearbyPlace:
    return NearbyPlace(
        id=place["id"],
        name=place["name"],
        group=place["group"],
        kind=place["kind"],
        location=LatLng(lat=place["lat"], lng=place["lng"]),
        listed_hours=place.get("opening_hours"),
        source_url=place["source_url"],
        distance_m=distance_m,
        along_route_m=along_route_m,
        ahead=ahead,
    )


def directions(req: DirectionsRequest) -> DirectionsResponse:
    result = compute_directions(req.route, req.kind)
    return DirectionsResponse(
        kind=req.kind,
        steps=[
            DirectionStep(
                instruction=s.instruction,
                maneuver=s.maneuver,
                street=s.street,
                location=LatLng(lat=s.lat, lng=s.lng),
                start_along_m=s.start_along_m,
                distance_m=s.distance_m,
                duration_s=s.duration_s,
                shade_pct=s.shade_pct,
                stairs=s.stairs,
            )
            for s in result.steps
        ],
        distance_m=result.distance_m,
        duration_s=result.duration_s,
        places=[
            _place(p, p["distance_from_route_m"], p["along_route_m"])
            for p in places_along(result.geometry)
        ],
        shade_layer=result.shade_layer,
    )


def tracking(req: TrackRequest) -> TrackResponse:
    update = track(
        req.geometry,
        (req.position.lat, req.position.lng),
        last_progress_m=req.last_progress_m,
        radius_m=req.radius_m,
    )
    return TrackResponse(
        progress_m=update.progress_m,
        remaining_m=update.remaining_m,
        remaining_s=update.remaining_s,
        distance_from_route_m=update.distance_from_route_m,
        off_route=update.off_route,
        arrived=update.arrived,
        nearby=[_place(n.place, n.distance_m, n.along_route_m, n.ahead) for n in update.nearby],
    )
