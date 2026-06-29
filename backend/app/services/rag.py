"""RAG (Retrieval-Augmented Generation) service.

Flow:
  embed question → match_chunks (pgvector) → build grounded prompt → LLM → answer + citations
"""
from __future__ import annotations

from typing import Iterator

from app.services.embeddings import embed_query
from app.llm.factory import get_provider
from app import db

# Sentinel returned when the vector search finds nothing relevant.
NO_INFO = "No relevant information found in the uploaded documents"


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def build_prompt(question: str, chunks: list[dict]) -> str:
    """Assemble a grounded RAG prompt from retrieved chunks."""
    context = "\n\n".join(
        f"[Source {i + 1}] {c['content']}" for i, c in enumerate(chunks)
    )
    return (
        "Answer the question using ONLY the context below. "
        "If the answer is not in the context, say you don't know.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n"
        "Answer:"
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _citations(chunks: list[dict]) -> list[dict]:
    return [
        {
            "document_id": c["document_id"],
            "page_number": c.get("page_number"),
            "section": c.get("section"),
            "content": c.get("content"),
        }
        for c in chunks
    ]


def _retrieve(question: str, document_ids: list[str]) -> list[dict]:
    return db.match_chunks(embed_query(question), document_ids)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def answer_question(question: str, document_ids: list[str]) -> dict:
    """Retrieve chunks and generate a grounded answer.

    Returns:
        {"answer": str, "citations": list[dict]}
        If no relevant chunks are found the answer is NO_INFO and citations is [].
    """
    chunks = _retrieve(question, document_ids)
    if not chunks:
        return {"answer": NO_INFO, "citations": []}
    answer = get_provider().generate(build_prompt(question, chunks))
    return {"answer": answer, "citations": _citations(chunks)}


def stream_answer(question: str, document_ids: list[str]) -> Iterator[str]:
    """Like answer_question but yields tokens for SSE streaming.

    If no relevant chunks are found, yields NO_INFO and returns.
    """
    chunks = _retrieve(question, document_ids)
    if not chunks:
        yield NO_INFO
        return
    yield from get_provider().stream(build_prompt(question, chunks))


def stream_answer_with_citations(
    question: str, document_ids: list[str]
) -> tuple[Iterator[str], list[dict]]:
    """Retrieve chunks once, return (token_iterator, citations_list).

    Separating retrieval from streaming lets the sessions router attach
    citations to the stored message before the stream finishes.
    """
    chunks = _retrieve(question, document_ids)
    if not chunks:

        def _no_info() -> Iterator[str]:
            yield NO_INFO

        return _no_info(), []

    citations = _citations(chunks)
    prompt = build_prompt(question, chunks)
    return get_provider().stream(prompt), citations
