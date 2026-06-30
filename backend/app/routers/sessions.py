import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app import db
from app.auth import require_user
from app.models import AskRequest, AttachDocumentsRequest, SessionCreate, SessionUpdate
from app.services import rag

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/sessions")
def create_session(body: SessionCreate, _user: dict = Depends(require_user)):
    return db.create_session(body.title)


@router.get("/sessions")
def list_sessions(_user: dict = Depends(require_user)):
    return db.list_sessions()


@router.get("/sessions/{session_id}")
def get_session(session_id: str, _user: dict = Depends(require_user)):
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")
    messages = db.get_messages(session_id)
    document_ids = db.session_document_ids(session_id)
    return {**session, "messages": messages, "document_ids": document_ids}


@router.patch("/sessions/{session_id}")
def update_session(session_id: str, body: SessionUpdate, _user: dict = Depends(require_user)):
    return db.update_session_title(session_id, body.title)


@router.post("/sessions/{session_id}/documents")
def attach_documents(
    session_id: str,
    body: AttachDocumentsRequest,
    _user: dict = Depends(require_user),
):
    doc_ids = [str(d) for d in body.document_ids]
    db.attach_documents(session_id, doc_ids)
    return {"attached": doc_ids}


@router.post("/sessions/{session_id}/ask")
def ask(
    session_id: str,
    body: AskRequest,
    _user: dict = Depends(require_user),
):
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")

    if body.document_ids is not None:
        doc_ids = [str(d) for d in body.document_ids]
    else:
        doc_ids = db.session_document_ids(session_id)

    if not doc_ids:
        raise HTTPException(400, "No documents attached to this session.")

    db.insert_message(session_id, "user", body.question, [])

    token_iter, citations = rag.stream_answer_with_citations(body.question, doc_ids)

    def event_stream():
        tokens = []
        try:
            for token in token_iter:
                tokens.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as exc:
            logger.exception("LLM stream error: %s", exc)
            error_msg = f"LLM error: {exc}"
            tokens.append(error_msg)
            yield f"data: {json.dumps({'token': error_msg})}\n\n"
        full_answer = "".join(tokens)
        msg = db.insert_message(session_id, "assistant", full_answer, citations)
        yield f"data: {json.dumps({'done': True, 'message_id': str(msg['id']), 'citations': citations})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
