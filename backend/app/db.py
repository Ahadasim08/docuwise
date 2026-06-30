"""
Supabase DB wrappers — all sync, thin over the supabase-py client.

The module-level `_client` variable is intentionally exposed so tests can
monkeypatch it without touching real Supabase credentials.
"""
from __future__ import annotations

from supabase import create_client, Client

from app.config import settings

# Lazy singleton — tests monkeypatch this directly.
_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

def insert_document(
    filename: str,
    file_type: str,
    size_bytes: int,
    storage_path: str,
) -> dict:
    """Insert a new document row with status='processing'. Returns the created row."""
    row = {
        "filename": filename,
        "file_type": file_type,
        "size_bytes": size_bytes,
        "storage_path": storage_path,
        "status": "processing",
    }
    return _get_client().table("documents").insert(row).execute().data[0]


def set_document_status(
    doc_id: str,
    status: str,
    error_message: str | None = None,
) -> None:
    """Update the status (and optional error_message) for a document."""
    updates: dict = {"status": status}
    if error_message is not None:
        updates["error_message"] = error_message
    _get_client().table("documents").update(updates).eq("id", doc_id).execute()


def list_documents() -> list[dict]:
    """Return all document rows ordered by creation time (newest first)."""
    return (
        _get_client()
        .table("documents")
        .select("*")
        .order("created_at", desc=True)
        .execute()
        .data
    )


# ---------------------------------------------------------------------------
# Chunks
# ---------------------------------------------------------------------------

def insert_chunks(rows: list[dict]) -> None:
    """Bulk-insert chunk rows.

    Each row should contain:
      document_id, content, page_number, section, chunk_index, token_count, embedding
    """
    if not rows:
        return
    _get_client().table("chunks").insert(rows).execute()


def match_chunks(
    query_embedding: list[float],
    document_ids: list[str],
    top_k: int = 10,
) -> list[dict]:
    """Call the Postgres `match_chunks` RPC and return the top-k results."""
    return (
        _get_client()
        .rpc(
            "match_chunks",
            {
                "query_embedding": "[" + ",".join(str(v) for v in query_embedding) + "]",
                "doc_ids": document_ids,
                "match_count": top_k,
            },
        )
        .execute()
        .data
    )


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

def create_session(title: str) -> dict:
    """Create a new chat session. Returns the created row."""
    row = {"title": title}
    return _get_client().table("sessions").insert(row).execute().data[0]


def delete_session(session_id: str) -> None:
    _get_client().table("sessions").delete().eq("id", session_id).execute()


def update_session_title(session_id: str, title: str) -> dict:
    result = _get_client().table("sessions").update({"title": title}).eq("id", session_id).execute()
    return result.data[0] if result.data else {}


def list_sessions() -> list[dict]:
    """Return all sessions ordered by most recently updated."""
    return (
        _get_client()
        .table("sessions")
        .select("*")
        .order("updated_at", desc=True)
        .execute()
        .data
    )


def get_session(session_id: str) -> dict | None:
    """Fetch a single session by ID. Returns the row dict."""
    result = (
        _get_client()
        .table("sessions")
        .select("*")
        .eq("id", session_id)
        .execute()
        .data
    )
    return result[0] if result else None


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

def insert_message(
    session_id: str,
    role: str,
    content: str,
    citations: list,
) -> dict:
    """Append a message to a session. Returns the created row."""
    row = {
        "session_id": session_id,
        "role": role,
        "content": content,
        "citations": citations,
    }
    return _get_client().table("messages").insert(row).execute().data[0]


def get_messages(session_id: str) -> list[dict]:
    """Return all messages for a session ordered chronologically."""
    return (
        _get_client()
        .table("messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
        .data
    )


# ---------------------------------------------------------------------------
# Session ↔ Document association
# ---------------------------------------------------------------------------

def attach_documents(session_id: str, document_ids: list[str]) -> None:
    """Link documents to a session."""
    if not document_ids:
        return
    rows = [
        {"session_id": session_id, "document_id": doc_id}
        for doc_id in document_ids
    ]
    _get_client().table("session_documents").upsert(rows, on_conflict="session_id,document_id").execute()


def session_document_ids(session_id: str) -> list[str]:
    """Return the list of document UUIDs attached to a session."""
    rows = (
        _get_client()
        .table("session_documents")
        .select("document_id")
        .eq("session_id", session_id)
        .execute()
        .data
    )
    return [r["document_id"] for r in rows]


# ---------------------------------------------------------------------------
# Additional document helpers
# ---------------------------------------------------------------------------

def get_document(doc_id: str) -> dict | None:
    """Fetch a single document row by ID."""
    result = _get_client().table("documents").select("*").eq("id", doc_id).execute().data
    return result[0] if result else None


def delete_document(doc_id: str) -> None:
    """Delete a document row (cascades to chunks via FK)."""
    _get_client().table("documents").delete().eq("id", doc_id).execute()


def get_document_chunks(doc_id: str) -> list[dict]:
    """Return all chunks for a document (content only; no embeddings)."""
    return (
        _get_client()
        .table("chunks")
        .select("id,content,page_number,section,chunk_index")
        .eq("document_id", doc_id)
        .order("chunk_index", desc=False)
        .execute()
        .data
    )
