from typing import Iterator, Optional
from google import genai
from app.config import settings
from app.llm.base import LLMProvider

class GeminiProvider(LLMProvider):
    def __init__(self):
        self.model = settings.gemini_model
        self._client: Optional[genai.Client] = None

    def _get_client(self) -> genai.Client:
        if self._client is None:
            self._client = genai.Client(api_key=settings.gemini_api_key)
        return self._client

    def generate(self, prompt: str) -> str:
        r = self._get_client().models.generate_content(model=self.model, contents=prompt)
        return r.text or ""

    def stream(self, prompt: str) -> Iterator[str]:
        for ch in self._get_client().models.generate_content_stream(model=self.model, contents=prompt):
            if ch.text:
                yield ch.text
