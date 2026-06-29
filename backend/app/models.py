"""
Pydantic request/response schemas for the AI Document Q&A API.

These are used by FastAPI route handlers (Phase 4) for validation and
OpenAPI documentation. They intentionally do NOT mirror the DB schema
1-to-1 — only the fields that cross the HTTP boundary are included.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

class DocumentOut(BaseModel):
    """A processed document returned from the API."""

    id: UUID
    filename: str
    file_type: str
    size_bytes: int
    storage_path: str
    status: str
    error_message: str | None = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

class SessionCreate(BaseModel):
    """Request body for creating a new chat session."""

    title: str = Field(default="New session", min_length=1, max_length=200)


class SessionOut(BaseModel):
    """A chat session returned from the API."""

    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

class Citation(BaseModel):
    """A single source citation attached to an AI answer."""

    document_id: UUID
    filename: str | None = None
    page_number: int | None = None
    section: str | None = None
    content: str | None = None  # the verbatim chunk text used as evidence
    similarity: float | None = None


class MessageOut(BaseModel):
    """A chat message (user or assistant) returned from the API."""

    id: UUID
    session_id: UUID
    role: str  # "user" | "assistant"
    content: str
    citations: list[Citation] = Field(default_factory=list)
    created_at: datetime


# ---------------------------------------------------------------------------
# Ask (Q&A request)
# ---------------------------------------------------------------------------

class AskRequest(BaseModel):
    """Request body for the /sessions/{id}/ask endpoint."""

    question: str = Field(..., min_length=1, max_length=4000)
    document_ids: list[UUID] | None = Field(
        default=None,
        description="Restrict search to these document IDs. If None, uses all session docs.",
    )


class AskResponse(BaseModel):
    """Non-streaming response from the /sessions/{id}/ask endpoint."""

    answer: str
    citations: list[Citation] = Field(default_factory=list)
    message_id: UUID


# ---------------------------------------------------------------------------
# Sessions ↔ Documents attachment
# ---------------------------------------------------------------------------

class AttachDocumentsRequest(BaseModel):
    """Request body for attaching documents to a session."""

    document_ids: list[UUID] = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

class UploadResponse(BaseModel):
    """Response after a successful file upload + processing trigger."""

    document_id: UUID
    filename: str
    status: str  # "processing" initially


# ---------------------------------------------------------------------------
# Generic
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str = "ok"
