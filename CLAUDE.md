# CLAUDE.md — AI Document Q&A App

Project instructions Claude reads at the start of every session. Living document — update as the project grows.

## Project Description

Internal web app: teams upload PDF/Word/CSV files and ask plain-English questions
across them. AI returns answers **with source citations** (document + page/section),
plus on-demand summaries. Conversation history saved per session. "Private ChatGPT
for your own files." Built as an Upwork deliverable **and** a portfolio piece (GitHub + LinkedIn).

Full spec: `docs/superpowers/specs/2026-06-29-ai-document-qa-design.md`
Build plan: `docs/superpowers/plans/2026-06-29-ai-document-qa.md` (follow task-by-task)

## Architecture

```
React (Vite)  ──HTTP──>  FastAPI backend  ──>  Supabase (Postgres + pgvector, Auth, Storage)
                               └──>  LLM provider (Gemini free default, swappable)
```

- **Single Python/FastAPI backend** owns everything server-side: auth check, uploads,
  parse → chunk → embed → store, vector search, RAG, sessions, summaries. (No Node service.)
- **React/Vite** is a pure client.
- **RAG flow:** embed question → pgvector cosine search across session's docs → grounded
  prompt → LLM → answer + citations.

## Tech Stack / Preferred Libraries

- Backend: Python 3.11+, FastAPI, uvicorn, pydantic-settings
- Parsing: `pypdf` (PDF), `python-docx` (Word), `pandas` (CSV)
- Embeddings: `sentence-transformers` model `all-MiniLM-L6-v2` (local, free, **384-dim**)
- Vector store: pgvector (cosine) in Supabase Postgres
- LLM: pluggable; default Gemini (`google-genai`, model `gemini-2.0-flash`)
- DB / Auth / Storage: Supabase
- Frontend: React, Vite, `@supabase/supabase-js`
- Tests: pytest (backend), Vitest (frontend)
- Deploy: Render

## Code Style

- TDD always: write failing test → run → minimal implementation → pass → commit.
- DRY, YAGNI. Small focused files, one responsibility each. Follow paths in the plan's File Structure.
- Thin route handlers; logic lives in `services/`. Services are pure + unit-testable.
- Friendly user-facing errors; detailed logs.

## Commands

```bash
# Backend (run from backend/)
pip install -r requirements.txt
python -m pytest -v                      # run tests
uvicorn app.main:app --reload            # dev server

# Frontend (run from frontend/)
npm install
npm run dev                              # dev server
npx vitest run                           # tests
npm run build                            # production build
```

## Critical Rules

- (important) **Never commit secrets.** No `.env`, API keys, or tokens in git. `.gitignore` blocks them — keep it that way.
- (important) **Every task = own branch → commit → merge to `main`.** Conventional Commits (`feat:`/`fix:`/`docs:`/`test:`/`chore:`). Small frequent commits, not big dumps.
- (important) **Follow the build plan task-by-task in order.** Each task ends with a passing test + commit. Don't skip ahead.
- (important) **Never hallucinate answers.** Empty retrieval returns exactly: `No relevant information found in the uploaded documents`.
- (important) **pgvector columns are `vector(384)`** — must match the embedding model dim.
- (important) **LLM access only through the provider layer** (`app/llm/factory.py`). Selectable via env `LLM_PROVIDER`. Never hardcode a model call elsewhere.
- All API routes except `/health` require a valid Supabase JWT.
- File uploads: allowlist `pdf`/`docx`/`csv`, max 20 MB, reject empty.
- Auth = single team login, **shared data** (no per-user isolation in v1).

## Environment Variables (set locally in .env — never commit)

- Backend: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_JWT_SECRET`, `LLM_PROVIDER=gemini`,
  `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.0-flash`
- Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`

## Accounts Needed (free tiers)

- Supabase (Postgres + Auth + Storage) — run `backend/supabase_schema.sql` in SQL editor
- Google AI Studio — Gemini API key
- Render — deploy
- GitHub — repo (see below)

---

## STATUS — what's done / what's left

**Done**
- [x] Spec written + committed
- [x] Implementation plan written + committed
- [x] Local git repo initialized, `.gitignore` blocking secrets

**Left to build (follow plan order):**
- [ ] Phase 0 — backend skeleton + Supabase schema
- [ ] Phase 1 — chunking, parsing, embeddings
- [ ] Phase 2 — LLM provider layer (Gemini)
- [ ] Phase 3 — DB wrappers, RAG, summaries
- [ ] Phase 4 — auth + API routes (upload/sessions/ask streaming) → tag `v0.1-mvp`
- [ ] Phase 5 — React frontend (auth, upload, chat+streaming+citations, summary, dark mode)
- [ ] Phase 6 — README, sample docs, Render deploy, demo video → tag `v1.0`

**To start a new session:** read this file + the plan, find the first unchecked task,
implement it task-by-task. Update the checkboxes above as phases complete.

---

## GitHub — connect for side-by-side commits

Repo not yet on GitHub. One-time setup:

1. Create an **empty** repo on github.com (no README/gitignore — we have them). Name e.g. `document-qa-app`.
2. In a session, tell Claude the repo URL. Claude runs:
   ```bash
   git remote add origin https://github.com/<you>/document-qa-app.git
   git push -u origin main
   ```
3. After that, **every task's commit pushes as we go** — Claude pushes the branch + opens/merges a PR per task so your contribution graph fills live.

(important) Each feature task should land its own commit **and be pushed the same session** so GitHub stays in sync with local progress.
