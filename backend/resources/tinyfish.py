"""Minimal TinyFish Fetch client. Used by scripts/refresh_resources.py, never per request."""

import httpx

from backend.api.config import get_settings

FETCH_URL = "https://api.fetch.tinyfish.ai"


class TinyFishError(RuntimeError):
    pass


def fetch_text(url: str, timeout: float = 150.0) -> str:
    """Return the page text as markdown. Raises TinyFishError on any failure."""
    key = get_settings().tinyfish_api_key
    if not key:
        raise TinyFishError("TINYFISH_API_KEY is not set")
    try:
        res = httpx.post(
            FETCH_URL,
            headers={"X-API-Key": key},
            json={"urls": [url], "format": "markdown"},
            timeout=timeout,
        )
    except httpx.HTTPError as exc:
        raise TinyFishError(f"request failed: {type(exc).__name__}") from exc
    if res.status_code != 200:
        raise TinyFishError(f"HTTP {res.status_code}")
    body = res.json()
    if body.get("errors"):
        raise TinyFishError(f"fetch error: {body['errors'][0]}")
    results = body.get("results") or []
    if not results or not results[0].get("text"):
        raise TinyFishError("empty page")
    return results[0]["text"]
