"""
Tests for backend/app/db.py — all supabase calls are monkeypatched.
"""
import pytest
from app import db


# ---------------------------------------------------------------------------
# Fake supabase client helpers
# ---------------------------------------------------------------------------

class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeTable:
    """Minimal fake for table().insert/select/update chains."""

    def __init__(self, store=None, return_data=None):
        self._store = store if store is not None else []
        self._return_data = return_data  # override what execute returns
        self._filters = {}
        self._updated = {}

    # insert — accepts a single dict or a list of dicts
    def insert(self, row):
        if isinstance(row, list):
            self._store.extend(row)
        else:
            self._store.append(row)
        return self

    # upsert — accepts a single dict or a list of dicts with on_conflict parameter
    def upsert(self, row, on_conflict=None):
        if isinstance(row, list):
            self._store.extend(row)
        else:
            self._store.append(row)
        return self

    # update
    def update(self, data):
        self._updated = data
        return self

    def eq(self, col, val):
        self._filters[col] = val
        return self

    # select
    def select(self, *args):
        return self

    def order(self, *args, **kwargs):
        return self

    def execute(self):
        if self._return_data is not None:
            return FakeResult(self._return_data)
        # For insert: wrap each store item with an id so callers can use .data[0]
        enriched = [dict(id="fake-uuid", **r) for r in self._store]
        return FakeResult(enriched)


class FakeRpc:
    def __init__(self, data):
        self._data = data

    def execute(self):
        return FakeResult(self._data)


class FakeClient:
    def __init__(self, table_data=None, rpc_data=None):
        self._table_store = []
        self._table_data = table_data  # static data to return from select
        self._rpc_data = rpc_data or []

    def table(self, name):
        return FakeTable(store=self._table_store, return_data=self._table_data)

    def rpc(self, fn_name, params):
        return FakeRpc(self._rpc_data)


# ---------------------------------------------------------------------------
# documents
# ---------------------------------------------------------------------------

def test_insert_document(monkeypatch):
    captured = []

    class Client:
        def table(self, name):
            return FakeTable(store=captured)

    monkeypatch.setattr(db, "_client", Client())
    result = db.insert_document("a.pdf", "pdf", 1024, "storage/a.pdf")
    assert captured[0]["filename"] == "a.pdf"
    assert captured[0]["status"] == "processing"
    assert captured[0]["file_type"] == "pdf"
    assert captured[0]["size_bytes"] == 1024
    assert captured[0]["storage_path"] == "storage/a.pdf"
    # result should be the first element of execute().data
    assert result["filename"] == "a.pdf"


def test_set_document_status(monkeypatch):
    updates = {}
    filters = {}

    class FakeUpdateTable:
        def update(self, data):
            updates.update(data)
            return self

        def eq(self, col, val):
            filters[col] = val
            return self

        def execute(self):
            return FakeResult([])

    class Client:
        def table(self, name):
            return FakeUpdateTable()

    monkeypatch.setattr(db, "_client", Client())
    db.set_document_status("doc-1", "ready")
    assert updates["status"] == "ready"
    assert filters["id"] == "doc-1"


def test_set_document_status_with_error(monkeypatch):
    updates = {}

    class FakeUpdateTable:
        def update(self, data):
            updates.update(data)
            return self

        def eq(self, col, val):
            return self

        def execute(self):
            return FakeResult([])

    class Client:
        def table(self, name):
            return FakeUpdateTable()

    monkeypatch.setattr(db, "_client", Client())
    db.set_document_status("doc-1", "error", error_message="parse failed")
    assert updates["status"] == "error"
    assert updates["error_message"] == "parse failed"


def test_list_documents(monkeypatch):
    docs = [{"id": "d1", "filename": "x.pdf", "status": "ready"}]

    class Client:
        def table(self, name):
            return FakeTable(return_data=docs)

    monkeypatch.setattr(db, "_client", Client())
    result = db.list_documents()
    assert result == docs


# ---------------------------------------------------------------------------
# chunks
# ---------------------------------------------------------------------------

def test_insert_chunks(monkeypatch):
    captured = []

    class FakeBatchTable:
        def insert(self, rows):
            captured.extend(rows)
            return self

        def execute(self):
            return FakeResult(captured)

    class Client:
        def table(self, name):
            return FakeBatchTable()

    monkeypatch.setattr(db, "_client", Client())
    rows = [
        {"document_id": "d1", "content": "hello", "page_number": 1,
         "section": None, "chunk_index": 0, "token_count": 5, "embedding": [0.1] * 384},
    ]
    db.insert_chunks(rows)
    assert captured[0]["content"] == "hello"


def test_match_chunks(monkeypatch):
    fake_rows = [
        {"id": "c1", "document_id": "d1", "content": "relevant", "page_number": 1,
         "section": None, "similarity": 0.92}
    ]

    class Client:
        def rpc(self, fn_name, params):
            assert fn_name == "match_chunks"
            assert params["match_count"] == 6
            return FakeRpc(fake_rows)

    monkeypatch.setattr(db, "_client", Client())
    result = db.match_chunks([0.1] * 384, ["d1"])
    assert result == fake_rows


def test_match_chunks_custom_top_k(monkeypatch):
    class Client:
        def rpc(self, fn_name, params):
            assert params["match_count"] == 3
            return FakeRpc([])

    monkeypatch.setattr(db, "_client", Client())
    db.match_chunks([0.0] * 384, ["d1"], top_k=3)


# ---------------------------------------------------------------------------
# sessions
# ---------------------------------------------------------------------------

def test_create_session(monkeypatch):
    captured = []

    class Client:
        def table(self, name):
            return FakeTable(store=captured)

    monkeypatch.setattr(db, "_client", Client())
    result = db.create_session("My session")
    assert captured[0]["title"] == "My session"
    assert result["title"] == "My session"


def test_list_sessions(monkeypatch):
    sessions = [{"id": "s1", "title": "A"}, {"id": "s2", "title": "B"}]

    class Client:
        def table(self, name):
            return FakeTable(return_data=sessions)

    monkeypatch.setattr(db, "_client", Client())
    result = db.list_sessions()
    assert result == sessions


def test_get_session(monkeypatch):
    session = [{"id": "s1", "title": "A"}]

    class FakeGetTable:
        def select(self, *args):
            return self

        def eq(self, col, val):
            return self

        def execute(self):
            return FakeResult(session)

    class Client:
        def table(self, name):
            return FakeGetTable()

    monkeypatch.setattr(db, "_client", Client())
    result = db.get_session("s1")
    assert result == session[0]


# ---------------------------------------------------------------------------
# messages
# ---------------------------------------------------------------------------

def test_insert_message(monkeypatch):
    captured = []

    class Client:
        def table(self, name):
            return FakeTable(store=captured)

    monkeypatch.setattr(db, "_client", Client())
    result = db.insert_message("s1", "user", "hello?", [])
    assert captured[0]["role"] == "user"
    assert captured[0]["content"] == "hello?"
    assert captured[0]["citations"] == []
    assert result["role"] == "user"


def test_get_messages(monkeypatch):
    msgs = [{"id": "m1", "role": "user", "content": "hi"}]

    class FakeMsgTable:
        def select(self, *args):
            return self

        def eq(self, col, val):
            return self

        def order(self, col, **kwargs):
            return self

        def execute(self):
            return FakeResult(msgs)

    class Client:
        def table(self, name):
            return FakeMsgTable()

    monkeypatch.setattr(db, "_client", Client())
    result = db.get_messages("s1")
    assert result == msgs


# ---------------------------------------------------------------------------
# session_documents
# ---------------------------------------------------------------------------

def test_attach_documents(monkeypatch):
    captured = []

    class Client:
        def table(self, name):
            return FakeTable(store=captured)

    monkeypatch.setattr(db, "_client", Client())
    db.attach_documents("s1", ["d1", "d2"])
    assert len(captured) == 2
    assert captured[0] == {"session_id": "s1", "document_id": "d1"}
    assert captured[1] == {"session_id": "s1", "document_id": "d2"}


def test_attach_documents_empty(monkeypatch):
    captured = []

    class Client:
        def table(self, name):
            return FakeTable(store=captured)

    monkeypatch.setattr(db, "_client", Client())
    db.attach_documents("s1", [])  # should not raise
    assert captured == []


def test_session_document_ids(monkeypatch):
    rows = [{"document_id": "d1"}, {"document_id": "d2"}]

    class FakeSdTable:
        def select(self, *args):
            return self

        def eq(self, col, val):
            return self

        def execute(self):
            return FakeResult(rows)

    class Client:
        def table(self, name):
            return FakeSdTable()

    monkeypatch.setattr(db, "_client", Client())
    result = db.session_document_ids("s1")
    assert result == ["d1", "d2"]
