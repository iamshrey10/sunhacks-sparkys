"""Route engine. Owner: Rohan.

Replace the body of compute_routes. Keep the signature: the API calls it as-is.
Return a real computed result, or raise NotImplementedError until it works.
Do not return hand-written sample routes from here.
"""

from backend.api.schemas import RouteRequest, RouteResponse


def compute_routes(req: RouteRequest) -> RouteResponse:
    raise NotImplementedError("Routing engine not implemented yet")
