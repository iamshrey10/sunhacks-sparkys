import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Environment-backed settings. Secrets are read here and nowhere else."""

    def __init__(self) -> None:
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        self.gemini_model = os.getenv("GEMINI_MODEL", "")
        self.tinyfish_api_key = os.getenv("TINYFISH_API_KEY", "")
        origins = os.getenv("CORS_ORIGINS", "")
        # Capacitor's Android WebView serves from http(s)://localhost.
        self.cors_origins = [
            "http://localhost:5173",
            "http://localhost",
            "https://localhost",
            "capacitor://localhost",
            *[o.strip() for o in origins.split(",") if o.strip()],
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
