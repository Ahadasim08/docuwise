# AI Document Q&A App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready internal web app where teams upload PDF/Word/CSV files and ask plain-English questions across them, getting AI answers with source citations and saved conversation history.

**Architecture:** Single Python/FastAPI backend owns parsing, chunking, local embeddings, pgvector search, RAG, sessions, and auth verification. React/Vite frontend is a pure client. Supabase provides Postgres+pgvector, Auth, and Storage. LLM access goes through a pluggable provider layer (Gemini free default, swappable to Claude/OpenAI).

**Tech Stack:** Python, FastAPI, uvicorn, pypdf, python-docx, pandas, sentence-transformers, pgvector, Supabase, React, Vite, pytest, Vitest. Deploy: Render.

## Global Constraints

- **Python** 3.11+; **Node** 20+.
- **LLM provider** selected via env `LLM_PROVIDER` (`gemini`|`claude`|`openai`), default `gemini`. Default model `gemini-2.0-flash`.
- **Embeddings** local only: `sentence-transformers` model `all-MiniLM-L6-v2` (384-dim). pgvector columns MUST be `vector(384)`.
- **Secrets** only via env vars. Never commit `.env`. `.gitignore` already blocks it.
- **Auth:** every API route except `/health` requires a valid Supabase JWT.
- **Commits:** Conventional Commits (`feat:`/`fix:`/`docs:`/`test:`/`chore:`). Each task = its own branch → PR → merge to `main`.
- **Errors:** user-facing messages friendly; logs detailed. Never hallucinate — empty retrieval returns the fixed "No relevant information found in the uploaded documents." string.
- **File limits:** allowlist `pdf`/`docx`/`csv`; max 20 MB; reject empty files.

---

## File Structure

```
backend/
  app/
    main.py                # FastAPI app, router mounts, CORS, /health
    config.py              # env settings (pydantic-settings)
    auth.py                # Supabase JWT verification dependency
    db.py                  # Supabase client + query wrappers
    models.py              # pydantic request/response schemas
    services/
      parsing.py           # pdf/docx/csv -> text + page/section metadata
      chunking.py          # text -> chunks (~500 tok, overlap)
      embeddings.py        # sentence-transformers wrapper
      rag.py               # retrieve + build prompt + call llm + citations
      summary.py           # map-reduce document summary
    llm/
      base.py              # LLMProvider ABC
      gemini.py            # GeminiProvider
      factory.py           # get_provider() from env
    routers/
      documents.py         # /upload, /documents, summary
      sessions.py          # /sessions, /ask
  tests/
    test_chunking.py
    test_parsing.py
    test_embeddings.py
    test_rag.py
    test_routes.py
  requirements.txt
  supabase_schema.sql
frontend/
  src/
    api/client.js          # fetch wrapper w/ auth token
    auth/                  # supabase auth + login screen
    components/            # Upload, Chat, Sessions sidebar, Summary, Citations
    App.jsx, main.jsx
  package.json, vite.config.js
  tests/
README.md
```

---

## Phase 0 — Repo & Scaffolding

### Task 0.1: Backend skeleton + health check

**Files:**
- Create: `backend/app/main.py`, `backend/app/config.py`, `backend/requirements.txt`
- Test: `backend/tests/test_routes.py`

**Interfaces:**
- Produces: FastAPI `app` in `app.main`; `GET /health` → `{"status":"ok"}`.

- [ ] **Step 1: requirements.txt**

```
fastapi==0.115.*
uvicorn[standard]==0.32.*
pydantic-settings==2.*
python-multipart==0.0.*
supabase==2.*
pypdf==5.*
python-docx==1.*
pandas==2.*
sentence-transformers==3.*
google-genai==0.*
pytest==8.*
httpx==0.27.*
```

- [ ] **Step 2: Write failing test**

```python
# backend/tests/test_routes.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
```

- [ ] **Step 3: Run, expect fail**

Run: `cd backend && python -m pytest tests/test_routes.py -v`
Expected: FAIL (ModuleNotFoundError: app.main)

- [ ] **Step 4: config.py + main.py**

```python
# backend/app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_jwt_secret: str = ""
    llm_provider: str = "gemini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    class Config:
        env_file = ".env"

settings = Settings()
```

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Document Q&A API")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Run, expect pass**

Run: `cd backend && python -m pytest tests/test_routes.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git checkout -b feat/backend-skeleton
git add backend/
git commit -m "feat: FastAPI skeleton with health check"
```

### Task 0.2: Supabase schema

**Files:**
- Create: `backend/supabase_schema.sql`

- [ ] **Step 1: Write schema**

```sql
-- backend/supabase_schema.sql
create extension if not exists vector;

create table documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  file_type text not null,
  size_bytes bigint not null,
  storage_path text not null,
  status text not null default 'processing',
  error_message text,
  created_at timestamptz default now()
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  page_number int,
  section text,
  chunk_index int not null,
  token_count int,
  embedding vector(384)
);
create index on chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'New session',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table session_documents (
  session_id uuid references sessions(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  primary key (session_id, document_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  role text not null,
  content text not null,
  citations jsonb default '[]',
  created_at timestamptz default now()
);
```

- [ ] **Step 2: Commit** (run this SQL in Supabase SQL editor manually during setup)

```bash
git add backend/supabase_schema.sql
git commit -m "feat: add supabase schema with pgvector"
```

---

## Phase 1 — Document Processing (pure logic, no I/O)

### Task 1.1: Chunking

**Files:**
- Create: `backend/app/services/chunking.py`
- Test: `backend/tests/test_chunking.py`

**Interfaces:**
- Produces: `chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]`. Splits on whitespace tokens; each chunk ≤ chunk_size tokens; consecutive chunks share `overlap` tokens; no empty chunks.

- [ ] **Step 1: Failing test**

```python
# backend/tests/test_chunking.py
from app.services.chunking import chunk_text

def test_chunks_respect_size():
    text = " ".join(str(i) for i in range(1200))
    chunks = chunk_text(text, chunk_size=500, overlap=50)
    assert all(len(c.split()) <= 500 for c in chunks)
    assert len(chunks) >= 3

def test_overlap_present():
    text = " ".join(str(i) for i in range(1000))
    chunks = chunk_text(text, chunk_size=500, overlap=50)
    tail = chunks[0].split()[-50:]
    head = chunks[1].split()[:50]
    assert tail == head

def test_no_empty_chunks():
    assert chunk_text("", 500, 50) == []
    assert all(c.strip() for c in chunk_text("hello world", 500, 50))
```

- [ ] **Step 2: Run, expect fail.** `cd backend && python -m pytest tests/test_chunking.py -v` → FAIL.

- [ ] **Step 3: Implement**

```python
# backend/app/services/chunking.py
def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    tokens = text.split()
    if not tokens:
        return []
    step = max(1, chunk_size - overlap)
    chunks = []
    for start in range(0, len(tokens), step):
        window = tokens[start:start + chunk_size]
        if window:
            chunks.append(" ".join(window))
        if start + chunk_size >= len(tokens):
            break
    return chunks
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/chunking
git add backend/app/services/chunking.py backend/tests/test_chunking.py
git commit -m "feat: token-based text chunking with overlap"
```

### Task 1.2: Parsing (PDF/Word/CSV → text + page/section)

**Files:**
- Create: `backend/app/services/parsing.py`
- Test: `backend/tests/test_parsing.py`

**Interfaces:**
- Produces: `parse_document(path: str, file_type: str) -> list[dict]` where each dict = `{"text": str, "page_number": int|None, "section": str|None}`. One entry per PDF page, per docx (single entry, section=None), per CSV (single entry of CSV rendered as text). Raises `ValueError` on unsupported type.

- [ ] **Step 1: Failing test** (uses tiny fixtures created in-test)

```python
# backend/tests/test_parsing.py
import csv, pytest
from docx import Document
from app.services.parsing import parse_document

def test_parse_csv(tmp_path):
    p = tmp_path / "d.csv"
    with open(p, "w", newline="") as f:
        w = csv.writer(f); w.writerow(["a","b"]); w.writerow(["1","2"])
    out = parse_document(str(p), "csv")
    assert len(out) == 1
    assert "a" in out[0]["text"] and "1" in out[0]["text"]

def test_parse_docx(tmp_path):
    p = tmp_path / "d.docx"
    doc = Document(); doc.add_paragraph("hello world"); doc.save(str(p))
    out = parse_document(str(p), "docx")
    assert "hello world" in out[0]["text"]

def test_unsupported():
    with pytest.raises(ValueError):
        parse_document("x.txt", "txt")
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement**

```python
# backend/app/services/parsing.py
import pandas as pd
from pypdf import PdfReader
from docx import Document

def parse_document(path: str, file_type: str) -> list[dict]:
    ft = file_type.lower()
    if ft == "pdf":
        reader = PdfReader(path)
        out = []
        for i, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                out.append({"text": text, "page_number": i, "section": None})
        return out
    if ft == "docx":
        doc = Document(path)
        text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        return [{"text": text, "page_number": None, "section": None}]
    if ft == "csv":
        df = pd.read_csv(path)
        return [{"text": df.to_csv(index=False), "page_number": None, "section": None}]
    raise ValueError(f"Unsupported file type: {file_type}")
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/parsing
git add backend/app/services/parsing.py backend/tests/test_parsing.py
git commit -m "feat: parse pdf/docx/csv into text segments"
```

### Task 1.3: Embeddings wrapper

**Files:**
- Create: `backend/app/services/embeddings.py`
- Test: `backend/tests/test_embeddings.py`

**Interfaces:**
- Produces: `embed_texts(texts: list[str]) -> list[list[float]]` returning 384-dim vectors; `embed_query(text: str) -> list[float]`. Model loaded once (module-level singleton).

- [ ] **Step 1: Failing test**

```python
# backend/tests/test_embeddings.py
from app.services.embeddings import embed_texts, embed_query

def test_dim():
    v = embed_query("hello")
    assert len(v) == 384

def test_batch():
    vs = embed_texts(["a", "b"])
    assert len(vs) == 2 and all(len(v) == 384 for v in vs)
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement**

```python
# backend/app/services/embeddings.py
from sentence_transformers import SentenceTransformer

_model = None

def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def embed_texts(texts: list[str]) -> list[list[float]]:
    vecs = _get_model().encode(texts, normalize_embeddings=True)
    return [v.tolist() for v in vecs]

def embed_query(text: str) -> list[float]:
    return embed_texts([text])[0]
```

- [ ] **Step 4: Run, expect pass.** (first run downloads model ~80MB)

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/embeddings
git add backend/app/services/embeddings.py backend/tests/test_embeddings.py
git commit -m "feat: local sentence-transformers embeddings"
```

---

## Phase 2 — LLM Provider Layer

### Task 2.1: Provider interface + Gemini + factory

**Files:**
- Create: `backend/app/llm/base.py`, `backend/app/llm/gemini.py`, `backend/app/llm/factory.py`
- Test: `backend/tests/test_llm.py`

**Interfaces:**
- Produces: `LLMProvider` ABC with `generate(prompt: str) -> str` and `stream(prompt: str) -> Iterator[str]`. `get_provider() -> LLMProvider` reads `settings.llm_provider`. `GeminiProvider` implements both.

- [ ] **Step 1: Failing test** (factory returns correct type; provider is mockable)

```python
# backend/tests/test_llm.py
from app.llm.base import LLMProvider
from app.llm.factory import get_provider

def test_factory_returns_provider():
    p = get_provider()
    assert isinstance(p, LLMProvider)

def test_unknown_provider(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "llm_provider", "bogus")
    import pytest
    with pytest.raises(ValueError):
        get_provider()
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement base**

```python
# backend/app/llm/base.py
from abc import ABC, abstractmethod
from typing import Iterator

class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str) -> str: ...
    @abstractmethod
    def stream(self, prompt: str) -> Iterator[str]: ...
```

```python
# backend/app/llm/gemini.py
from typing import Iterator
from google import genai
from app.config import settings
from app.llm.base import LLMProvider

class GeminiProvider(LLMProvider):
    def __init__(self):
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = settings.gemini_model

    def generate(self, prompt: str) -> str:
        r = self.client.models.generate_content(model=self.model, contents=prompt)
        return r.text or ""

    def stream(self, prompt: str) -> Iterator[str]:
        for ch in self.client.models.generate_content_stream(model=self.model, contents=prompt):
            if ch.text:
                yield ch.text
```

```python
# backend/app/llm/factory.py
from app.config import settings
from app.llm.base import LLMProvider
from app.llm.gemini import GeminiProvider

def get_provider() -> LLMProvider:
    if settings.llm_provider == "gemini":
        return GeminiProvider()
    raise ValueError(f"Unknown LLM provider: {settings.llm_provider}")
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/llm-provider
git add backend/app/llm backend/tests/test_llm.py
git commit -m "feat: pluggable LLM provider with Gemini default"
```

---

## Phase 3 — Persistence & RAG

### Task 3.1: Supabase DB wrappers

**Files:**
- Create: `backend/app/db.py`, `backend/app/models.py`
- Test: `backend/tests/test_db.py` (mock supabase client)

**Interfaces:**
- Produces (all sync wrappers over supabase client):
  - `insert_document(filename, file_type, size_bytes, storage_path) -> dict`
  - `set_document_status(doc_id, status, error_message=None) -> None`
  - `insert_chunks(rows: list[dict]) -> None` (rows have document_id, content, page_number, section, chunk_index, token_count, embedding)
  - `match_chunks(query_embedding: list[float], document_ids: list[str], top_k: int = 6) -> list[dict]` (calls Postgres RPC `match_chunks`)
  - `create_session(title) -> dict`, `list_sessions() -> list[dict]`, `get_session(id) -> dict`, `get_messages(session_id) -> list[dict]`
  - `attach_documents(session_id, document_ids) -> None`, `session_document_ids(session_id) -> list[str]`
  - `insert_message(session_id, role, content, citations) -> dict`

- [ ] **Step 1:** Add the `match_chunks` RPC to `supabase_schema.sql`:

```sql
create or replace function match_chunks(
  query_embedding vector(384), doc_ids uuid[], match_count int)
returns table (id uuid, document_id uuid, content text,
               page_number int, section text, similarity float)
language sql stable as $$
  select c.id, c.document_id, c.content, c.page_number, c.section,
         1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where c.document_id = any(doc_ids)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
```

- [ ] **Step 2: Failing test** (inject a fake client)

```python
# backend/tests/test_db.py
from app import db

class FakeTable:
    def __init__(self, store): self.store = store
    def insert(self, row): self.store.append(row); return self
    def execute(self): return type("R", (), {"data": self.store})()

def test_insert_document(monkeypatch):
    captured = []
    class FakeClient:
        def table(self, name): return FakeTable(captured)
    monkeypatch.setattr(db, "_client", FakeClient())
    db.insert_document("a.pdf", "pdf", 10, "path/a.pdf")
    assert captured[0]["filename"] == "a.pdf"
    assert captured[0]["status"] == "processing"
```

- [ ] **Step 3: Run, expect fail.**

- [ ] **Step 4: Implement** (`_client` lazy singleton; full body for each wrapper — write all listed functions, mirroring the insert pattern; `match_chunks` uses `_get_client().rpc("match_chunks", {...}).execute().data`).

```python
# backend/app/db.py  (abbreviated core; implement all interface fns)
from supabase import create_client
from app.config import settings

_client = None
def _get_client():
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client

def insert_document(filename, file_type, size_bytes, storage_path) -> dict:
    row = {"filename": filename, "file_type": file_type,
           "size_bytes": size_bytes, "storage_path": storage_path,
           "status": "processing"}
    return _get_client().table("documents").insert(row).execute().data[0]

def match_chunks(query_embedding, document_ids, top_k=6) -> list[dict]:
    return _get_client().rpc("match_chunks", {
        "query_embedding": query_embedding,
        "doc_ids": document_ids, "match_count": top_k}).execute().data
# ... remaining wrappers follow the same insert/select pattern
```

- [ ] **Step 5: Run, expect pass. Commit**

```bash
git checkout -b feat/db-layer
git add backend/app/db.py backend/app/models.py backend/supabase_schema.sql backend/tests/test_db.py
git commit -m "feat: supabase persistence layer + match_chunks rpc"
```

### Task 3.2: RAG service

**Files:**
- Create: `backend/app/services/rag.py`
- Test: `backend/tests/test_rag.py`

**Interfaces:**
- Consumes: `embed_query`, `db.match_chunks`, `get_provider`.
- Produces:
  - `build_prompt(question: str, chunks: list[dict]) -> str`
  - `answer_question(question: str, document_ids: list[str]) -> dict` → `{"answer": str, "citations": list[dict]}`. If no chunks, answer = the fixed no-info string, citations = []. Citation = `{"document_id", "page_number", "section"}`.
  - `stream_answer(question, document_ids) -> Iterator[str]` for SSE.

- [ ] **Step 1: Failing test** (mock retrieval + provider)

```python
# backend/tests/test_rag.py
from app.services import rag

def test_no_chunks(monkeypatch):
    monkeypatch.setattr(rag, "embed_query", lambda q: [0.0]*384)
    monkeypatch.setattr(rag.db, "match_chunks", lambda *a, **k: [])
    out = rag.answer_question("hi", ["doc1"])
    assert out["answer"] == "No relevant information found in the uploaded documents"
    assert out["citations"] == []

def test_with_chunks(monkeypatch):
    monkeypatch.setattr(rag, "embed_query", lambda q: [0.0]*384)
    monkeypatch.setattr(rag.db, "match_chunks",
        lambda *a, **k: [{"document_id":"d1","content":"Paris is capital",
                          "page_number":1,"section":None}])
    class FakeP:
        def generate(self, p): return "Paris"
    monkeypatch.setattr(rag, "get_provider", lambda: FakeP())
    out = rag.answer_question("capital?", ["d1"])
    assert out["answer"] == "Paris"
    assert out["citations"][0]["document_id"] == "d1"
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement**

```python
# backend/app/services/rag.py
from typing import Iterator
from app.services.embeddings import embed_query
from app.llm.factory import get_provider
from app import db

NO_INFO = "No relevant information found in the uploaded documents"

def build_prompt(question: str, chunks: list[dict]) -> str:
    context = "\n\n".join(
        f"[Source {i+1}] {c['content']}" for i, c in enumerate(chunks))
    return (
        "Answer the question using ONLY the context below. "
        "If the answer is not in the context, say you don't know.\n\n"
        f"Context:\n{context}\n\nQuestion: {question}\nAnswer:")

def _citations(chunks):
    return [{"document_id": c["document_id"],
             "page_number": c.get("page_number"),
             "section": c.get("section")} for c in chunks]

def answer_question(question: str, document_ids: list[str]) -> dict:
    chunks = db.match_chunks(embed_query(question), document_ids)
    if not chunks:
        return {"answer": NO_INFO, "citations": []}
    answer = get_provider().generate(build_prompt(question, chunks))
    return {"answer": answer, "citations": _citations(chunks)}

def stream_answer(question: str, document_ids: list[str]) -> Iterator[str]:
    chunks = db.match_chunks(embed_query(question), document_ids)
    if not chunks:
        yield NO_INFO
        return
    yield from get_provider().stream(build_prompt(question, chunks))
```

- [ ] **Step 4: Run, expect pass. Commit**

```bash
git checkout -b feat/rag
git add backend/app/services/rag.py backend/tests/test_rag.py
git commit -m "feat: RAG retrieval, grounded prompt, citations"
```

### Task 3.3: Summary service

**Files:**
- Create: `backend/app/services/summary.py`
- Test: add to `backend/tests/test_rag.py` or `test_summary.py`

**Interfaces:**
- Produces: `summarize_chunks(chunks: list[str]) -> str` (map-reduce: summarize each, then combine).

- [ ] **Step 1: Failing test**

```python
# backend/tests/test_summary.py
from app.services import summary

def test_summarize(monkeypatch):
    class FakeP:
        def generate(self, p): return "summary"
    monkeypatch.setattr(summary, "get_provider", lambda: FakeP())
    assert summary.summarize_chunks(["a","b"]) == "summary"
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement**

```python
# backend/app/services/summary.py
from app.llm.factory import get_provider

def summarize_chunks(chunks: list[str]) -> str:
    p = get_provider()
    if len(chunks) <= 1:
        text = chunks[0] if chunks else ""
        return p.generate(f"Summarize concisely:\n\n{text}")
    partials = [p.generate(f"Summarize:\n\n{c}") for c in chunks]
    return p.generate("Combine these into one summary:\n\n" + "\n".join(partials))
```

- [ ] **Step 4: Run, expect pass. Commit**

```bash
git add backend/app/services/summary.py backend/tests/test_summary.py
git commit -m "feat: map-reduce document summary"
```

---

## Phase 4 — Auth & API Routes

### Task 4.1: Supabase JWT auth dependency

**Files:**
- Create: `backend/app/auth.py`
- Test: `backend/tests/test_auth.py`

**Interfaces:**
- Produces: `require_user(authorization: str = Header(...)) -> dict` FastAPI dependency that decodes the Supabase JWT with `settings.supabase_jwt_secret` (HS256), returns claims, raises 401 on missing/invalid.

- [ ] **Step 1: Failing test**

```python
# backend/tests/test_auth.py
import jwt, pytest
from fastapi import HTTPException
from app.auth import require_user
from app.config import settings

def test_valid(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", "secret")
    tok = jwt.encode({"sub": "u1"}, "secret", algorithm="HS256")
    assert require_user(f"Bearer {tok}")["sub"] == "u1"

def test_missing():
    with pytest.raises(HTTPException):
        require_user("")
```

- [ ] **Step 2: Run, expect fail** (add `pyjwt` to requirements).

- [ ] **Step 3: Implement**

```python
# backend/app/auth.py
import jwt
from fastapi import Header, HTTPException
from app.config import settings

def require_user(authorization: str = Header(default="")) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        return jwt.decode(token, settings.supabase_jwt_secret,
                          algorithms=["HS256"], audience="authenticated")
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
```

- [ ] **Step 4: Run, expect pass. Commit**

```bash
git checkout -b feat/auth
git add backend/app/auth.py backend/tests/test_auth.py backend/requirements.txt
git commit -m "feat: supabase JWT auth dependency"
```

### Task 4.2: Documents router (upload + list + summary + delete)

**Files:**
- Create: `backend/app/routers/documents.py`
- Modify: `backend/app/main.py` (mount router)
- Test: `backend/tests/test_documents_route.py`

**Interfaces:**
- Consumes: parsing, chunking, embeddings, db, summary, `require_user`.
- Produces routes: `POST /upload` (multipart file), `GET /documents`, `DELETE /documents/{id}`, `POST /documents/{id}/summary`.
- Upload flow: validate type/size → upload bytes to Supabase Storage → `insert_document` → parse → chunk per segment → embed → `insert_chunks` → status `ready`; on exception set status `error` with message.

- [ ] **Step 1: Failing test** (mock services + auth override)

```python
# backend/tests/test_documents_route.py
from fastapi.testclient import TestClient
from app.main import app
from app.auth import require_user
app.dependency_overrides[require_user] = lambda: {"sub": "u1"}
client = TestClient(app)

def test_reject_bad_type():
    r = client.post("/upload", files={"file": ("x.txt", b"hi", "text/plain")})
    assert r.status_code == 400

def test_list(monkeypatch):
    from app.routers import documents
    monkeypatch.setattr(documents.db, "list_documents", lambda: [{"id":"1"}])
    r = client.get("/documents")
    assert r.status_code == 200 and r.json()[0]["id"] == "1"
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** the router with validation constants (`ALLOWED={"pdf","docx","csv"}`, `MAX=20*1024*1024`), `_ext()` helper, full upload pipeline wrapped in try/except setting `error` status, and a `storage.upload` call via `db._get_client().storage`. Mount with `app.include_router(documents.router)` in `main.py`. (Write complete handler bodies — no placeholders.)

- [ ] **Step 4: Run, expect pass. Commit**

```bash
git add backend/app/routers/documents.py backend/app/main.py backend/tests/test_documents_route.py
git commit -m "feat: documents router with upload pipeline"
```

### Task 4.3: Sessions router (sessions + attach + ask streaming + history)

**Files:**
- Create: `backend/app/routers/sessions.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_sessions_route.py`

**Interfaces:**
- Consumes: db, rag, `require_user`.
- Produces: `POST /sessions`, `GET /sessions`, `GET /sessions/{id}` (session + messages), `POST /sessions/{id}/documents` (body `{document_ids: [...]}`), `POST /sessions/{id}/ask` (body `{question: str}`) returning `StreamingResponse` (SSE). Ask flow: persist user message → stream tokens → after stream, persist assistant message with citations (compute citations via `rag.answer_question` path or capture from a combined helper).
- Note: for streaming + citation persistence, implement `rag.stream_answer_with_citations(question, doc_ids)` returning `(token_iter, citations)` — refactor in Task 3.2 if needed, or compute citations first (retrieve once), stream generation, then save.

- [ ] **Step 1: Failing test**

```python
# backend/tests/test_sessions_route.py
from fastapi.testclient import TestClient
from app.main import app
from app.auth import require_user
app.dependency_overrides[require_user] = lambda: {"sub": "u1"}
client = TestClient(app)

def test_create_session(monkeypatch):
    from app.routers import sessions
    monkeypatch.setattr(sessions.db, "create_session",
                        lambda title: {"id":"s1","title":title})
    r = client.post("/sessions", json={"title":"Q3"})
    assert r.status_code == 200 and r.json()["id"] == "s1"
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** all routes; `/ask` retrieves chunks once (citations), saves user msg, returns `StreamingResponse(generator, media_type="text/event-stream")` that yields tokens and on completion calls `db.insert_message(..., role="assistant", citations=...)`. Mount router in `main.py`.

- [ ] **Step 4: Run, expect pass. Commit**

```bash
git add backend/app/routers/sessions.py backend/app/main.py backend/tests/test_sessions_route.py
git commit -m "feat: sessions router with streaming ask + history"
```

### Milestone tag

- [ ] After Phase 4 green: `git tag v0.1-mvp` (backend feature-complete).

---

## Phase 5 — Frontend (React/Vite)

### Task 5.1: Scaffold + Supabase auth + login screen

**Files:**
- Create: `frontend/` (Vite React), `frontend/src/auth/supabase.js`, `frontend/src/auth/Login.jsx`, `frontend/src/api/client.js`
- Test: `frontend/tests/client.test.js` (Vitest)

**Interfaces:**
- Produces: `supabase` client (env `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); `apiFetch(path, opts)` that injects `Authorization: Bearer <session token>`; `Login` component (email/password via Supabase). App gates on session.

- [ ] **Step 1:** Scaffold: `npm create vite@latest frontend -- --template react`, add `@supabase/supabase-js`, `vitest`.
- [ ] **Step 2: Failing test**

```javascript
// frontend/tests/client.test.js
import { test, expect, vi } from "vitest";
import { buildHeaders } from "../src/api/client";

test("adds bearer token", () => {
  const h = buildHeaders("tok123", {});
  expect(h.Authorization).toBe("Bearer tok123");
});
```

- [ ] **Step 3:** Implement `client.js` exporting `buildHeaders(token, base)` and `apiFetch`; `supabase.js`; `Login.jsx`.
- [ ] **Step 4: Run** `cd frontend && npx vitest run` → PASS.
- [ ] **Step 5: Commit**

```bash
git checkout -b feat/frontend-auth
git add frontend/
git commit -m "feat: React scaffold, supabase auth, api client"
```

### Task 5.2: Upload component (drag-drop + status)

**Files:** Create `frontend/src/components/Upload.jsx`, test `frontend/tests/upload.test.jsx`.

**Interfaces:** Produces `<Upload onUploaded={fn} />` — drag-drop + file picker, validates type client-side, posts to `/upload`, shows per-file `processing|ready|error` state. File-type icons.

- [ ] Steps: failing render test (renders dropzone, rejects `.txt`) → implement → pass → commit `feat: drag-drop upload component`.

### Task 5.3: Sessions sidebar + multi-doc attach

**Files:** Create `frontend/src/components/Sessions.jsx`, test.

**Interfaces:** Produces `<Sessions current onSelect onNew />` listing sessions (`GET /sessions`), create new, and a document-attach panel (checkbox list → `POST /sessions/{id}/documents`).

- [ ] Steps: failing test (renders session list from mocked fetch) → implement → pass → commit `feat: sessions sidebar with multi-doc attach`.

### Task 5.4: Chat interface with streaming + citations

**Files:** Create `frontend/src/components/Chat.jsx`, `frontend/src/components/Citation.jsx`, test.

**Interfaces:** Produces `<Chat sessionId />` — loads history (`GET /sessions/{id}`), input box, posts to `/ask`, consumes SSE stream and renders tokens incrementally, renders assistant message with expandable citations (`document name · page/section`). Loading/"thinking" indicator.

- [ ] Steps: failing test (renders streamed tokens from a mocked ReadableStream; renders citation chips) → implement SSE reader → pass → commit `feat: streaming chat with citations`.

### Task 5.5: Summary view + dark mode + app shell

**Files:** Create `frontend/src/components/Summary.jsx`, `frontend/src/App.jsx`, theme toggle, test.

**Interfaces:** Produces document summary trigger (`POST /documents/{id}/summary`), dark-mode toggle persisted to `localStorage`, and `App.jsx` composing Login gate + sidebar + chat + upload.

- [ ] Steps: failing test (App renders Login when no session) → implement → pass → commit `feat: summary view, dark mode, app shell`.

---

## Phase 6 — Polish, Docs, Deploy

### Task 6.1: README

**Files:** Create `README.md`.

- [ ] Write: title, one-liner, demo GIF placeholder, architecture diagram (ASCII from spec), feature list, tech-stack badges, live-demo link placeholder, local setup (backend `pip install -r requirements.txt`, env vars, `uvicorn app.main:app`; frontend `npm i && npm run dev`), Supabase setup (run `supabase_schema.sql`), "What I learned" section.
- [ ] Commit `docs: comprehensive README`.

### Task 6.2: Sample docs + seed script

**Files:** Create `samples/` (a sample PDF, docx, csv), `scripts/seed.py`.

- [ ] `seed.py` uploads sample docs via the API so the live demo is pre-populated. Commit `chore: sample docs and seed script`.

### Task 6.3: Deploy config (Render)

**Files:** Create `render.yaml`, `backend/Dockerfile` (or build cmd), frontend static build config.

- [ ] Backend web service (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`), env vars set in Render dashboard (not committed). Frontend static site (`npm run build` → `dist`). Set frontend `VITE_API_URL` to backend URL; backend CORS to frontend URL.
- [ ] Deploy, smoke-test live `/health` + one upload + one question.
- [ ] Commit `chore: render deploy config`. Update README demo link.

### Task 6.4: Demo video

- [ ] Record ~30s: login → upload 2 docs → ask cross-doc question → show streamed answer + citation → show summary. Save link in README. (Manual; no commit needed beyond README link.)

### Final milestone

- [ ] All tests green, live demo working: `git tag v1.0` and push. Create GitHub repo, add remote, push all branches + tags.

---

## Self-Review Notes (coverage check)

- Multi-doc Q&A → Task 3.2 (`match_chunks` over `document_ids`) + 5.3 attach + 5.4 ask. ✓
- Citations → 3.2 `_citations` + 4.3 persist + 5.4 render. ✓
- History → 4.3 `GET /sessions/{id}` + 5.4 load. ✓
- Summaries → 3.3 + 4.2 + 5.5. ✓
- PDF/Word/CSV → 1.2. ✓
- Auth (login, shared data) → 4.1 + 5.1. ✓
- Error handling → 4.2 upload try/except + rag NO_INFO + validation. ✓
- Pluggable LLM / Gemini → 2.1. ✓ Local embeddings → 1.3. ✓
- Streaming → 2.1 `stream` + 4.3 SSE + 5.4 reader. ✓
- Polish: README 6.1, live demo 6.3, streaming above, tests throughout, demo video 6.4, dark/drag-drop/icons 5.2/5.4/5.5. ✓
- Deploy 6.3. ✓ Git discipline: every task branch+commit, tags v0.1-mvp / v1.0. ✓
