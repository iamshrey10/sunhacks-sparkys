"""Task 1: prove the Gemini key works. Reads the key from .env, never prints it.

Run from the repo root:  .venv\\Scripts\\python scripts\\check_gemini.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from google import genai  # noqa: E402

from backend.api.config import get_settings  # noqa: E402

settings = get_settings()
if not settings.gemini_api_key:
    sys.exit("GEMINI_API_KEY is empty in .env")

client = genai.Client(api_key=settings.gemini_api_key)

print("Flash models your key can use:")
for m in client.models.list():
    if "flash" in m.name and "generateContent" in (m.supported_actions or []):
        print("  ", m.name.removeprefix("models/"))

if not settings.gemini_model:
    sys.exit("\nPick one of the names above and set GEMINI_MODEL= in .env, then rerun.")

reply = client.models.generate_content(
    model=settings.gemini_model,
    contents="In one short sentence, why is shade useful when walking in Tempe in summer?",
)
print(f"\nModel {settings.gemini_model} replied:\n{reply.text}")
