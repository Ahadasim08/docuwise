# AI-Powered Document Q&A Web App — Design Spec

**Date:** 2026-06-29
**Author:** Aahad Khan
**Context:** Upwork client deliverable + personal portfolio piece (GitHub + LinkedIn).

---

## 1. Summary

An internal web app where business teams upload documents (PDF, Word, CSV) and
interact with them in natural language: AI summaries, key-data extraction, and
plain-English Q&A across multiple files at once. Answers include source
citations (which document, which page/section). Conversation history is saved
per session. Effectively a "private ChatGPT for your own files."

This is a production-ready handoff, not a prototype: clean code, error handling,
and a deployed app non-technical staff can use from day one.

## 2. Goals & Non-Goals

### Goals
- Upload + parse PDF, Word (.docx), CSV.
- Multi-document sessions — ask one question across several uploaded files.
- RAG-based Q&A with **source citations** (document name + page/section).
- On-demand per-document summaries + key-data extraction.
- Per-session conversation history, persisted and reloadable.
- Simple team login (one auth gate, shared workspace/data).
- Deployed live demo, non-technical staff can use immediately.
- Portfolio-grade: strong README, live demo, streaming answers, tests, demo video.

### Non-Goals (YAGNI)
- Per-user private data / row-level isolation (shared data is fine for v1).
- Billing, multi-tenant org management, admin panels, RBAC.
- Mobile native apps.
- Fine-tuning / training custom models.

## 3. Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Backend shape | **Single Python / FastAPI** backend (no separate Node service) | Fewer moving parts, no inter-service hop, easier deploy + handoff. Brief listed Node, but a single backend is functionally identical and simpler — flag this to client at delivery as an informed choice. |
| LLM provider | **Pluggable provider layer**; default **Gemini free tier** for dev | Zero cost during build. Swap to Claude/OpenAI for production via one env var. |
| Embeddings | **Local `sentence-transformers`** | Free, no API bill, runs on-machine. |
| Vector store | **pgvector** in Supabase Postgres | One database for metadata + vectors. Free tier. |
| Auth | **Supabase Auth**, single login, shared data | Brief is "internal team"; small trusted group. Fast to build. |
| Storage | **Supabase Storage** for raw files | Same platform, free tier. |
| Frontend | **React + Vite** | Brief requirement; fast dev. |
| Deploy | **Render** (backend) + **Render/Static** (frontend) | Free tier, brief-approved platform. |

## 4. Architecture

```
React (Vite)  ──HTTP──>  FastAPI backend  ──>  Supabase (Postgres + pgvector, Auth, Storage)
                               │
                               └──>  LLM provider (Gemini free default, swappable)
```

The FastAPI backend owns everything server-side: auth verification, file
uploads, document parsing, chunking, embedding, vector search, RAG querying,
session + message persistence, and summaries. React is a pure client.

### Components (each independently testable)
- **Frontend (React/Vite):** upload UI (drag-drop), chat interface (streaming),
  summary view, session sidebar, citation display. Dark mode + loading states.
- **API layer (FastAPI routers):** thin HTTP handlers, validation, auth middleware.
- **Document service:** parse (PDF/Word/CSV) → chunk → embed → persist.
- **RAG service:** embed question → vector search across session docs → build
  context → call LLM → return answer + citations.
- **LLM provider interface:** `LLMProvider` abstract class; `GeminiProvider`
  default, `ClaudeProvider` / `OpenAIProvider` addable. Selected via `LLM_PROVIDER` env.
- **Persistence layer:** Supabase client wrappers for each table.

## 5. Data Model (Supabase Postgres)

- `documents` — id, filename, file_type, size_bytes, storage_path, status
  (`processing|ready|error`), error_message, created_at
- `chunks` — id, document_id (FK), content, page_number, section, embedding
  `vector`, token_count, chunk_index
- `sessions` — id, title, created_at, updated_at
- `session_documents` — session_id (FK), document_id (FK)  *(many-to-many)*
- `messages` — id, session_id (FK), role (`user|assistant`), content,
  citations (jsonb), created_at
- `auth.users` — Supabase built-in

## 6. API Surface (FastAPI)

| Method | Path | Purpose |
|---|---|---|
| POST | `/upload` | Store file, parse, chunk, embed |
| GET | `/documents` | List uploaded documents |
| DELETE | `/documents/{id}` | Remove document + chunks |
| POST | `/documents/{id}/summary` | On-demand summary |
| POST | `/sessions` | Create session |
| GET | `/sessions` | List sessions |
| GET | `/sessions/{id}` | Session + full message history |
| POST | `/sessions/{id}/documents` | Attach documents to session |
| POST | `/sessions/{id}/ask` | RAG answer + citations (streaming) |

All routes behind Supabase JWT auth middleware.

## 7. Core Flows

**Upload:** React → `POST /upload` → validate type/size → store raw file in
Supabase Storage → create `documents` row (`processing`) → parse → chunk
(recursive, ~500 tokens, overlap) → embed each chunk locally → insert `chunks`
with vectors → mark `ready`. Errors → `error` status + message surfaced in UI.

**Ask:** React → `POST /sessions/{id}/ask` → save user message → embed question
→ pgvector cosine search across all chunks of session's documents → assemble
top-k context → call LLM with grounded prompt → **stream** answer tokens to UI →
attach citations `{document, page/section}` → persist assistant message.

**Summary:** `POST /documents/{id}/summary` → map-reduce summarize document chunks → return.

**History:** every message persisted; `GET /sessions/{id}` reloads full thread.

## 8. Error Handling (brief emphasizes this)

- File validation: type allowlist (pdf/docx/csv), max size, reject empty.
- Parse failures: caught per-document, status=`error`, message shown in UI, app stays usable.
- LLM calls: timeout + retry with backoff; rate-limit handled gracefully.
- Empty retrieval: return "No relevant information found in the uploaded documents" — never hallucinate.
- Structured logging at each layer; user-facing errors are friendly, logs are detailed.

## 9. Portfolio Polish (all approved)

1. **README** — demo GIF, architecture diagram, feature list, live-demo link, setup steps, tech badges, "what I learned."
2. **Live demo** — deployed to Render, seeded with sample docs.
3. **Streaming answers** — token-by-token rendering.
4. **Tests** — parsing, chunking, RAG retrieval, key API routes.
5. **Demo video** — ~30s screen recording for LinkedIn.
6. **UI polish** — dark mode, drag-drop upload, loading/thinking states, file-type icons.

## 10. Git / Workflow Discipline (from commit #1)

- Initialize repo before any code; first commit = spec + README skeleton.
- Feature branches → PRs → merge to `main` (even solo).
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).
- Small, frequent commits — readable history + active contribution graph.
- `.gitignore` secrets; never commit `.env` / API keys.
- Milestone tags: `v0.1-mvp`, `v1.0`.

## 11. Tech Stack

- **Frontend:** React, Vite, (chat/markdown rendering, SSE for streaming).
- **Backend:** Python, FastAPI, uvicorn.
- **Parsing:** `pypdf` (PDF), `python-docx` (Word), `pandas` (CSV).
- **Embeddings:** `sentence-transformers` (local).
- **Vector search:** pgvector (cosine).
- **LLM:** Gemini (free, default), pluggable to Claude/OpenAI.
- **DB / Auth / Storage:** Supabase.
- **Deploy:** Render.
- **Tests:** pytest (backend), Vitest (frontend).

## 12. Open Items / Risks

- Render free tier cold starts — acceptable for demo; note in README.
- Gemini free-tier rate limits — handle gracefully; document the env swap to a paid provider for production.
- Local embedding model size — pick a small fast model (e.g. `all-MiniLM-L6-v2`) to fit free hosting memory.
