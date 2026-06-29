from fastapi.testclient import TestClient

from app.auth import require_user
from app.main import app

app.dependency_overrides[require_user] = lambda: {"sub": "u1"}
client = TestClient(app)


def test_create_session(monkeypatch):
    from app.routers import sessions
    monkeypatch.setattr(sessions.db, "create_session",
                        lambda title: {"id": "s1", "title": title})
    r = client.post("/sessions", json={"title": "Q3"})
    assert r.status_code == 200
    assert r.json()["id"] == "s1"


def test_list_sessions(monkeypatch):
    from app.routers import sessions
    monkeypatch.setattr(sessions.db, "list_sessions",
                        lambda: [{"id": "s1", "title": "Q3"}])
    r = client.get("/sessions")
    assert r.status_code == 200
    assert r.json()[0]["id"] == "s1"


def test_get_session_not_found(monkeypatch):
    from app.routers import sessions
    monkeypatch.setattr(sessions.db, "get_session", lambda sid: None)
    r = client.get("/sessions/does-not-exist")
    assert r.status_code == 404


def test_get_session(monkeypatch):
    from app.routers import sessions
    monkeypatch.setattr(sessions.db, "get_session",
                        lambda sid: {"id": sid, "title": "T"})
    monkeypatch.setattr(sessions.db, "get_messages", lambda sid: [])
    r = client.get("/sessions/s1")
    assert r.status_code == 200
    assert r.json()["id"] == "s1"
    assert r.json()["messages"] == []


def test_attach_documents(monkeypatch):
    from app.routers import sessions
    attached = {}
    monkeypatch.setattr(sessions.db, "attach_documents",
                        lambda sid, ids: attached.update({"sid": sid, "ids": ids}))
    import uuid
    doc_id = str(uuid.uuid4())
    r = client.post("/sessions/s1/documents", json={"document_ids": [doc_id]})
    assert r.status_code == 200
    assert doc_id in r.json()["attached"]


def test_ask_no_docs(monkeypatch):
    from app.routers import sessions
    monkeypatch.setattr(sessions.db, "get_session",
                        lambda sid: {"id": sid, "title": "T"})
    monkeypatch.setattr(sessions.db, "session_document_ids", lambda sid: [])
    r = client.post("/sessions/s1/ask", json={"question": "what?"})
    assert r.status_code == 400


def test_ask_streams(monkeypatch):
    from app.routers import sessions
    monkeypatch.setattr(sessions.db, "get_session",
                        lambda sid: {"id": sid, "title": "T"})
    monkeypatch.setattr(sessions.db, "session_document_ids", lambda sid: ["d1"])
    monkeypatch.setattr(sessions.db, "insert_message",
                        lambda *a, **kw: {"id": "m1"})
    monkeypatch.setattr(sessions.rag, "stream_answer_with_citations",
                        lambda q, ids: (iter(["Hello", " world"]), []))
    r = client.post("/sessions/s1/ask", json={"question": "hi?"})
    assert r.status_code == 200
    body = r.text
    assert "Hello" in body
    assert "world" in body
    assert "done" in body
