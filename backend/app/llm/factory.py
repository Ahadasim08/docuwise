from app.config import settings
from app.llm.base import LLMProvider
from app.llm.gemini import GeminiProvider

def get_provider() -> LLMProvider:
    if settings.llm_provider == "gemini":
        return GeminiProvider()
    raise ValueError(f"Unknown LLM provider: {settings.llm_provider}")
