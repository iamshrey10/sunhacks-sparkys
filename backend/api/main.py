from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.ai import service as ai
from backend.api.config import get_settings
from backend.api.errors import UpstreamError
from backend.api.ratelimit import SlidingWindowLimiter
from backend.api.schemas import (
    ExplainRequest,
    ExplainResponse,
    Health,
    LatLng,
    ParseRequest,
    ParseResponse,
    ResourcesResponse,
    RouteRequest,
    RouteResponse,
)
from backend.resources import service as resources
from backend.routing import engine

settings = get_settings()

app = FastAPI(title="Cool Route API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(UpstreamError)
async def upstream_error_handler(_: Request, exc: UpstreamError) -> JSONResponse:
    return JSONResponse(
        status_code=502,
        content={"detail": str(exc) or "An upstream service failed"},
    )


# Gemini endpoints cost money and the demo API is public, so cap them:
# per caller, and in total across all callers.
_per_caller = SlidingWindowLimiter(limit=20, window_s=60)
_overall = SlidingWindowLimiter(limit=150, window_s=60)


def _caller(request: Request) -> str:
    # Behind the Cloudflare tunnel the real address is in this header.
    forwarded = request.headers.get("cf-connecting-ip")
    if forwarded:
        return forwarded
    return request.client.host if request.client else "unknown"


def limit_gemini_calls(request: Request) -> None:
    if not _per_caller.allow(_caller(request)) or not _overall.allow("all"):
        raise HTTPException(status_code=429, detail="Too many requests, try again in a minute")


def _not_ready(exc: NotImplementedError) -> HTTPException:
    return HTTPException(status_code=501, detail=str(exc) or "Not implemented yet")


@app.get("/health", response_model=Health)
def health() -> Health:
    return Health(
        gemini_configured=bool(settings.gemini_api_key),
        tinyfish_configured=bool(settings.tinyfish_api_key),
    )


@app.post("/route", response_model=RouteResponse)
def route(req: RouteRequest) -> RouteResponse:
    try:
        return engine.compute_routes(req)
    except NotImplementedError as exc:
        raise _not_ready(exc)


@app.get("/resources", response_model=ResourcesResponse)
def get_resources(
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
    radius_m: int = Query(default=1500, ge=100, le=5000),
) -> ResourcesResponse:
    try:
        return resources.get_resources(LatLng(lat=lat, lng=lng), radius_m)
    except NotImplementedError as exc:
        raise _not_ready(exc)


@app.post("/parse", response_model=ParseResponse, dependencies=[Depends(limit_gemini_calls)])
def parse(req: ParseRequest) -> ParseResponse:
    try:
        return ai.parse_request(req)
    except NotImplementedError as exc:
        raise _not_ready(exc)


@app.post("/explain", response_model=ExplainResponse, dependencies=[Depends(limit_gemini_calls)])
def explain(req: ExplainRequest) -> ExplainResponse:
    try:
        return ai.explain_route(req)
    except NotImplementedError as exc:
        raise _not_ready(exc)
