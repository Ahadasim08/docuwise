"""Tests for the RAG service (Task 3.2)."""
from typing import Iterator

import pytest

from app.services import rag


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FAKE_CHUNK = {
    "document_id": "d1",
    "content": "Paris is the capital of France.",
    "page_number": 1,
    "section": None,
}


class FakeProvider:
    """Synchronous fake LLM provider."""

    def generate(self, prompt: str) -> str:
        return "Paris"

    def stream(self, prompt: str) -> Iterator[str]:
        yield from ["Par", "is"]


# ---------------------------------------------------------------------------
# answer_question
# ---------------------------------------------------------------------------


def test_no_chunks(monkeypatch):
    monkeypatch.setattr(rag, "embed_query", lambda q: [0.0] * 384)
    monkeypatch.setattr(rag.db, "match_chunks", lambda *a, **k: [])
    out = rag.answer_question("hi", ["doc1"])
    assert out["answer"] == rag.NO_INFO
    assert out["citations"] == []


def test_with_chunks(monkeypatch):
    monkeypatch.setattr(rag, "embed_query", lambda q: [0.0] * 384)
    monkeypatch.setattr(rag.db, "match_chunks", lambda *a, **k: [FAKE_CHUNK])
    monkeypatch.setattr(rag, "get_provider", lambda: FakeProvider())
    out = rag.answer_question("capital?", ["d1"])
    assert out["answer"] == "Paris"
    assert len(out["citations"]) == 1
    assert out["citations"][0]["document_id"] == "d1"
    assert out["citations"][0]["page_number"] == 1
    assert out["citations"][0]["section"] is None


# ---------------------------------------------------------------------------
# stream_answer
# ---------------------------------------------------------------------------


def test_stream_no_chunks(monkeypatch):
    monkeypatch.setattr(rag, "embed_query", lambda q: [0.0] * 384)
    monkeypatch.setattr(rag.db, "match_chunks", lambda *a, **k: [])
    tokens = list(rag.stream_answer("hi", ["doc1"]))
    assert tokens == [rag.NO_INFO]


def test_stream_with_chunks(monkeypatch):
    monkeypatch.setattr(rag, "embed_query", lambda q: [0.0] * 384)
    monkeypatch.setattr(rag.db, "match_chunks", lambda *a, **k: [FAKE_CHUNK])
    monkeypatch.setattr(rag, "get_provider", lambda: FakeProvider())
    tokens = list(rag.stream_answer("capital?", ["d1"]))
    assert tokens == ["Par", "is"]


# ---------------------------------------------------------------------------
# stream_answer_with_citations
# ---------------------------------------------------------------------------


def test_stream_with_citations(monkeypatch):
    monkeypatch.setattr(rag, "embed_query", lambda q: [0.0] * 384)
    monkeypatch.setattr(rag.db, "match_chunks", lambda *a, **k: [FAKE_CHUNK])
    monkeypatch.setattr(rag, "get_provider", lambda: FakeProvider())
    token_iter, citations = rag.stream_answer_with_citations("capital?", ["d1"])
    tokens = list(token_iter)
    assert tokens == ["Par", "is"]
    assert len(citations) == 1
    assert citations[0]["document_id"] == "d1"


def test_stream_with_citations_no_chunks(monkeypatch):
    monkeypatch.setattr(rag, "embed_query", lambda q: [0.0] * 384)
    monkeypatch.setattr(rag.db, "match_chunks", lambda *a, **k: [])
    token_iter, citations = rag.stream_answer_with_citations("hi", ["doc1"])
    tokens = list(token_iter)
    assert tokens == [rag.NO_INFO]
    assert citations == []


# ---------------------------------------------------------------------------
# build_prompt
# ---------------------------------------------------------------------------


def test_build_prompt_contains_question_and_context():
    chunks = [{"content": "The sky is blue.", "document_id": "d1", "page_number": None, "section": None}]
    prompt = rag.build_prompt("What colour is the sky?", chunks)
    assert "What colour is the sky?" in prompt
    assert "The sky is blue." in prompt
    assert "[Source 1]" in prompt
