"""Gemini-backed request parsing and route explanation. Owner: Shravani.

Keep the signatures. Gemini is called only from here, with the key from
backend.api.config.get_settings(). Never send the key or user location to
anything else. Raise NotImplementedError until a function works.
"""

from backend.api.schemas import (
    ExplainRequest,
    ExplainResponse,
    ParseRequest,
    ParseResponse,
)


def parse_request(req: ParseRequest) -> ParseResponse:
    raise NotImplementedError("Request parser not implemented yet")


def explain_route(req: ExplainRequest) -> ExplainResponse:
    raise NotImplementedError("Route explainer not implemented yet")
