// backend/services/ai_service.py
import os
import json
from typing import Any, Dict

# Try to import OpenAI library; if unavailable, we'll fallback to mock.
try:
    import openai
except ImportError:
    openai = None

class AIService:
    """Abstraction layer for AI interactions.

    Uses OpenAI API when the `OPENAI_API_KEY` environment variable is set and the
    `openai` package is available. Otherwise, falls back to a deterministic mock
    implementation that returns a JSON‑serialisable response mimicking the shape
    expected by the frontend.
    """

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.use_real_api = bool(self.api_key) and openai is not None
        if self.use_real_api:
            openai.api_key = self.api_key
        else:
            # Deterministic mock: simple rule‑based responses based on the prompt.
            self.mock_counter = 0

    def _mock_response(self, prompt: str) -> Dict[str, Any]:
        """Generate a deterministic mock response.

        The mock simply echoes the prompt back with a canned message. It also
        increments an internal counter so that repeated calls produce slightly
        different data, which is useful for demo purposes.
        """
        self.mock_counter += 1
        return {
            "model": "mock-gpt",
            "prompt": prompt,
            "response": f"This is a mock response #{self.mock_counter} for: {prompt}",
            "metadata": {"source": "deterministic-mock"},
        }

    def get_response(self, prompt: str) -> Dict[str, Any]:
        """Public entry point used by the backend services.

        Returns a JSON‑serialisable dictionary. When the real OpenAI API is
        available, calls the `ChatCompletion` endpoint with a single user message.
        Otherwise, returns the deterministic mock.
        """
        if self.use_real_api:
            try:
                completion = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                )
                # Extract the assistant's reply safely.
                reply = completion.choices[0].message.content if getattr(completion, "choices", None) else ""
                return {
                    "model": "gpt-3.5-turbo",
                    "prompt": prompt,
                    "response": reply,
                    "metadata": {"usage": getattr(completion, "usage", {})},
                }
            except Exception:
                # Fallback to mock on any failure to keep the demo functional.
                return self._mock_response(prompt)
        else:
            return self._mock_response(prompt)

# Module‑level singleton for convenient imports.
ai_service = AIService()
