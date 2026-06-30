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
        "You are a helpful document assistant. Answer the user's question based on the provided document excerpts.\n\n"
        "Guidelines:\n"
        "- Be thorough and specific — quote or reference details from the sources when useful\n"
        "- Use markdown formatting (bullet points, bold, headers) to make the answer easy to read\n"
        "- Synthesize across multiple sources if relevant information appears in more than one\n"
        "- If the documents don't contain enough information to fully answer, say what you found and note what's missing\n"
        "- Never invent facts not present in the sources\n\n"
        f"Document excerpts:\n{context}\n\n"
        f"Question: {question}\n\n"
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
