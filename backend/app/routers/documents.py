import os
import tempfile

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app import db
from app.auth import require_user
from app.services import chunking, embeddings, parsing
from app.services import summary as summary_service

router = APIRouter()

ALLOWED = {"pdf", "docx", "csv"}
MAX_SIZE = 20 * 1024 * 1024


def _ext(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


@router.post("/upload")
def upload_document(file: UploadFile = File(...), _user: dict = Depends(require_user)):
    ext = _ext(file.filename or "")
    if ext not in ALLOWED:
        raise HTTPException(400, f"File type '{ext}' not allowed. Use pdf, docx, or csv.")

    data = file.file.read()
    if not data:
        raise HTTPException(400, "Empty file rejected.")
    if len(data) > MAX_SIZE:
        raise HTTPException(400, "File exceeds 20 MB limit.")

    storage_path = f"documents/{file.filename}"
    db._get_client().storage.from_("documents").upload(storage_path, data)

    doc = db.insert_document(file.filename, ext, len(data), storage_path)
    doc_id = doc["id"]

    try:
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        try:
            pages = parsing.parse_document(tmp_path, ext)
        finally:
            os.unlink(tmp_path)

        rows = []
        for page in pages:
            chunks = chunking.chunk_text(page["text"])
            vecs = embeddings.embed_texts(chunks)
            for i, (text, vec) in enumerate(zip(chunks, vecs)):
                rows.append({
                    "document_id": doc_id,
                    "content": text,
                    "page_number": page.get("page_number"),
                    "section": page.get("section"),
                    "chunk_index": i,
                    "token_count": len(text.split()),
                    "embedding": vec,
                })
        db.insert_chunks(rows)
        db.set_document_status(doc_id, "ready")
    except Exception as exc:
        db.set_document_status(doc_id, "error", str(exc))
        raise HTTPException(500, f"Processing failed: {exc}")

    return {"document_id": doc_id, "filename": file.filename, "status": "ready"}


@router.get("/documents")
def list_documents(_user: dict = Depends(require_user)):
    return db.list_documents()


@router.delete("/documents/{doc_id}", status_code=204)
def delete_document(doc_id: str, _user: dict = Depends(require_user)):
    db.delete_document(doc_id)


@router.post("/documents/{doc_id}/summary")
def get_document_summary(doc_id: str, _user: dict = Depends(require_user)):
    chunks = db.get_document_chunks(doc_id)
    if not chunks:
        raise HTTPException(404, "No content found for this document.")
    texts = [c["content"] for c in chunks]
    result = summary_service.summarize_chunks(texts)
    return {"summary": result}
