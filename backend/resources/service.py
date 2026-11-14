"""Nearby water and cooling resources. Owner: Shreyas.

Keep the signature. Return only data we can source. Unknown stays None.
"""

from datetime import datetime, timezone

from backend.api.schemas import LatLng, ResourcesResponse


def get_resources(center: LatLng, radius_m: int = 1500) -> ResourcesResponse:
    raise NotImplementedError("Resources service not implemented yet")


def _now() -> datetime:
    return datetime.now(timezone.utc)
