# DocuWise — AI Document Q&A

Ask plain-English questions across your uploaded PDFs, Word docs, and CSVs. Get answers with source citations. Private, fast, self-hosted.

---

## Features

- **Multi-format upload** — PDF, DOCX, CSV (up to 20 MB each)
- **RAG-powered answers** — vector search over your documents; answers grounded in retrieved content
- **Source citations** — every answer shows which document and page it came from
- **Streaming responses** — tokens stream in real time, no waiting for full response
- **Session history** — conversations saved; pick up where you left off
- **Per-query doc selector** — toggle which documents a query searches across
- **Document summary** — one-click summary of any uploaded doc
- **Dark mode** — system-aware, toggle in sidebar

---

## Architecture

```
React (Vite)  ──HTTP──>  FastAPI backend  ──>  Supabase (Postgres + pgvector, Auth, Storage)
                               └──>  Groq / Gemini (LLM)
                               └──>  sentence-transformers (local embeddings)
```

**RAG flow:**
```
upload → parse (pdf/docx/csv) → chunk (~500 tokens, 50-token overlap)
       → embed (all-MiniLM-L6-v2, 384-dim) → store in pgvector

ask → embed question → cosine search in pgvector → build grounded prompt
    → LLM stream → SSE to client → save answer + citations
```

**Backend layers:**
- `app/routers/` — thin FastAPI route handlers (auth via `Depends(require_user)`)
- `app/services/` — pure logic: parsing, chunking, embeddings, RAG, summary
- `app/db.py` — Supabase client wrapper
- `app/llm/` — pluggable LLM layer (`LLM_PROVIDER=groq|gemini`)
- `app/auth.py` — validates Supabase JWTs (JWKS, ECC P-256)

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 8, Tailwind CSS, shadcn/ui, lucide-react |
| Backend | Python 3.11+, FastAPI, uvicorn, pydantic-settings |
| Embeddings | `sentence-transformers` `all-MiniLM-L6-v2` (local, 384-dim) |
| Vector DB | Supabase Postgres + pgvector (HNSW index) |
| Auth / Storage | Supabase Auth + Storage |
| LLM | Groq `llama-3.3-70b-versatile` (default) or Gemini 2.0 Flash |
| Parsing | pypdf, python-docx, pandas |

---

## Local Setup

### Prerequisites

- Python 3.11+
- Node 20+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Groq](https://console.groq.com) API key (free tier works)

### 1. Supabase Schema

In your Supabase project → SQL Editor, run `backend/supabase_schema.sql`. This creates:
- `documents`, `chunks`, `sessions`, `session_documents`, `messages` tables
- `match_chunks` RPC (pgvector cosine search)
- HNSW index on `chunks.embedding`

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:
```
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_KEY=<service_role_key>
SUPABASE_JWT_SECRET=<jwt_secret>
LLM_PROVIDER=groq
GROQ_API_KEY=<your_groq_key>
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=<optional>
GEMINI_MODEL=gemini-2.0-flash
```

> Use the **service role key** (not anon key) — needed for storage + RLS bypass.
> JWT secret is in Supabase → Settings → API → JWT Secret.

```bash
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/health should return {"status":"ok"}
```

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
# → http://localhost:5173
```

### 4. First login

Supabase Auth is configured for email/password. Create a user in your Supabase dashboard → Authentication → Users → Add user. Then log in at `http://localhost:5173`.

---

## Running Tests

```bash
# Backend
cd backend
python -m pytest -v

# Frontend
cd frontend
npx vitest run
```

---

## Deploy (Render)

See `render.yaml` for the full config. Quick steps:

1. Push this repo to GitHub.
2. Create a Render account → New → Blueprint → connect your repo.
3. Render will detect `render.yaml` and create:
   - **Backend web service** (FastAPI)
   - **Frontend static site** (Vite build)
4. Set all backend env vars in the Render dashboard (same as `.env` above, plus `FRONTEND_URL=https://<your-frontend>.onrender.com`).
5. Update `VITE_API_URL` in the frontend service's env vars to your backend URL.
6. Hit deploy. Check `/health` on the backend URL.

---

## Sample Data

`samples/` contains three demo documents:

| File | Content |
|------|---------|
| `engineering_handbook.pdf` | Fictional engineering handbook (5 sections) |
| `product_overview.docx` | Fictional product overview with pricing and roadmap |
| `company_handbook.csv` | Fictional company policy FAQ |
| `q3_financial_report.csv` | Fictional Q3 financial metrics |

To pre-populate a live demo:
```bash
cd scripts
python seed.py --url http://localhost:8000 --email you@example.com --password yourpass
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_KEY` | Yes | Service role key |
| `SUPABASE_JWT_SECRET` | Yes | JWT secret for token verification |
| `LLM_PROVIDER` | No | `groq` or `gemini` (default: `groq`) |
| `GROQ_API_KEY` | If using Groq | Groq API key |
| `GROQ_MODEL` | No | Default: `llama-3.3-70b-versatile` |
| `GEMINI_API_KEY` | If using Gemini | Google Gemini API key |
| `GEMINI_MODEL` | No | Default: `gemini-2.0-flash` |
| `FRONTEND_URL` | Production | Allowed CORS origin for frontend |

---

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| Local embeddings (sentence-transformers) | No API cost, no rate limits, ~80MB model download once |
| HNSW index (not IVFFlat) | IVFFlat needs large dataset to train well; HNSW works on small data |
| Groq default (not Gemini) | Gemini free tier has `limit=0` quota in some regions |
| Service role key | Anon key blocked by RLS on storage + tables in this setup |
| SSE streaming | Better UX than polling; FastAPI `StreamingResponse` + `ReadableStream` on client |
| Per-session doc scoping | Each query can target a subset of the session's docs |

---

## What I Learned

- **pgvector + HNSW**: IVFFlat requires a minimum dataset size to build clusters — HNSW is safer for apps that start with small data.
- **Supabase JWT verification**: Supabase uses ECC P-256 keys, not HS256 in production — need JWKS endpoint, not the raw secret.
- **SSE + FastAPI**: `StreamingResponse` with `text/event-stream` content type; client must handle partial JSON correctly.
- **Embedding as string**: supabase-py sends Python lists as JSON arrays, which Postgres can't implicitly cast to `vector(384)` — must stringify and cast.
- **React flex scroll**: `h-screen overflow-hidden` on root + `min-h-0` on every flex child in the chain — missing any one breaks overflow.
