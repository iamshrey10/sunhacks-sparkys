class UpstreamError(Exception):
    """An outside service (Gemini, TinyFish) failed.

    Raise this from a module with a short, user-safe message. The API turns it into
    a 502 response. Never put keys, user locations or raw upstream bodies in the message.
    """
