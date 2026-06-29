from app.llm.base import LLMProvider
from app.llm.factory import get_provider

def test_factory_returns_provider():
    p = get_provider()
    assert isinstance(p, LLMProvider)

def test_unknown_provider(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "llm_provider", "bogus")
    import pytest
    with pytest.raises(ValueError):
        get_provider()
