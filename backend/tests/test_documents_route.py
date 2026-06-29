from fastapi.testclient import TestClient

from app.auth import require_user
from app.main import app

app.dependency_overrides[require_user] = lambda: {"sub": "u1"}
client = TestClient(app)


def test_reject_bad_type():
    r = client.post("/upload", files={"file": ("x.txt", b"hi", "text/plain")})
    assert r.status_code == 400
    assert "not allowed" in r.json()["detail"]


def test_reject_empty():
    r = client.post("/upload", files={"file": ("x.pdf", b"", "application/pdf")})
    assert r.status_code == 400
    assert "Empty" in r.json()["detail"]


def test_list(monkeypatch):
    from app.routers import documents
    monkeypatch.setattr(documents.db, "list_documents", lambda: [{"id": "1", "filename": "a.pdf"}])
    r = client.get("/documents")
    assert r.status_code == 200
    assert r.json()[0]["id"] == "1"


def test_delete(monkeypatch):
    from app.routers import documents
    deleted = []
    monkeypatch.setattr(documents.db, "delete_document", lambda doc_id: deleted.append(doc_id))
    r = client.delete("/documents/abc-123")
    assert r.status_code == 204
    assert "abc-123" in deleted
