# DocuWise — Progress Log

> Read this at the start of every session before touching code.

---

## Phase Status

| Phase | Status |
|-------|--------|
| 0 — Backend skeleton + schema | Complete |
| 1 — Chunking, parsing, embeddings | Complete |
| 2 — LLM provider layer | Complete |
| 3 — DB wrappers, RAG, summaries | Complete |
| 4 — Auth + API routes | Complete |
| 5 — React frontend | Complete |
| 6 — README, deploy, demo | **Complete** — tagged v1.0 |

---

## Phase 6 — Complete ✅

### What Was Built

- **README.md** — architecture diagram, full local setup, env vars table, deploy guide, design decisions, "What I learned" section
- **samples/** — `engineering_handbook.pdf`, `product_overview.docx`, `company_handbook.csv`, `q3_financial_report.csv`
- **scripts/make_samples.py** — generates the PDF + DOCX sample files (requires `fpdf2`, `python-docx`)
- **scripts/seed.py** — uploads samples and creates a demo session via the API
- **render.yaml** — Render Blueprint config for backend web service + frontend static site
- **CORS update** — `main.py` reads `FRONTEND_URL` env var; `config.py` adds `frontend_url` field
- **Landing page** — `frontend/src/pages/Landing.jsx` shown before login (CTA → Login)
- **Tag v1.0** — full app feature-complete

### Remaining Manual Steps

1. **Demo video** (Task 6.4) — record ~30s using OpenScreen: login → upload → ask → streaming answer + citation → summary. Add link to README when done.
2. ~~**GitHub push**~~ — ✅ done. `main` + `v1.0` tag live at `https://github.com/Ahadasim08/docuwise`
3. **Render deploy** — create account → New Blueprint → connect repo → set env vars in dashboard → deploy → smoke-test `/health` + upload + question.
4. **Update README** — add live demo URL and demo video link once deploy is done.

---

## Phase 5 — Complete ✅

Full flow verified end-to-end: login → new session → upload → ask → streaming answer with citations.

### What Works
- Login / signup (Supabase auth, JWKS JWT verification)
- Session create, list, rename (auto-renames from first question), delete
- Document upload → background embed → polling until ready
- Per-doc source selector (2-col grid panel, toggle active docs per query)
- RAG: vector search scoped to selected docs only — separate docs give separate answers
- SSE streaming with citations in `done` event
- Sidebar: sessions scrollable, sign-out pinned at bottom
- DocuWise brand mark (FileSearch icon + two-line label)

### LLM Provider
Switched from Gemini → **Groq** (`llama-3.3-70b-versatile`).
Gemini has `limit: 0` free tier quota in this region — permanently broken.
`LLM_PROVIDER=groq` in `backend/.env`.

---

## Key Decisions

| Decision | Reason |
|----------|--------|
| Groq instead of Gemini | Gemini 429 `limit=0` in user's region; Groq free tier works |
| HNSW index instead of IVFFlat | IVFFlat with lists=100/probes=1 missed all data on small dataset |
| Vector embedding as string `"[v1,v2,…]"` | supabase-py JSON array not castable to `vector(384)` |
| `BackgroundTasks` for embed | `/upload` returns 202 immediately; frontend polls `GET /documents/{id}` |
| Service role key in backend | Anon key blocked by RLS on storage + tables |
| JWKS JWT verification | Supabase uses ECC P-256; PyJWKClient handles key rotation |
| `h-screen overflow-hidden` + `min-h-0` on flex children | Required for scroll to work in nested flex layout |
| `FRONTEND_URL` env var for CORS | Keeps local origins hardcoded; prod origin set in Render dashboard |

---

## Environment

### backend/.env (never commit)
```
SUPABASE_URL=https://xzrgindagiohvqrianaz.supabase.co
SUPABASE_KEY=<service_role_key>
SUPABASE_JWT_SECRET=<jwt_secret>
LLM_PROVIDER=groq
GROQ_API_KEY=<groq_key>
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=<key>          ← unused, keep for reference
GEMINI_MODEL=gemini-2.0-flash ← unused
FRONTEND_URL=                 ← set in Render dashboard for production
```

### frontend/.env.local (never commit)
```
VITE_SUPABASE_URL=https://xzrgindagiohvqrianaz.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_API_URL=http://localhost:8000
```

### Supabase setup (already done)
- Storage bucket `documents` exists
- Tables + `match_chunks` RPC from `backend/supabase_schema.sql`
- HNSW index on `chunks.embedding` (replaced IVFFlat)
- `match_chunks` function uses plain `LANGUAGE sql STABLE` (no `SET LOCAL`)

---

## All Commits (chronological)

| Hash | Description |
|------|-------------|
| `a503727` | fix: CORS explicit origins, SSE error handling, Groq LLM provider |
| `eaf179b` | feat: doc selector toggles, auto-rename session, branding + sidebar fix |
| `5ccd868` | fix: restore scroll — add min-h-0 to flex children blocking overflow |
| `808040f` | fix: move scrollbar to viewport edge — width constraint inside ScrollArea |
| `0176db2` | feat: delete session — trash icon on hover |
| `ed6b3ac` | feat: sources panel — 2-col grid with file icons, active indicator |
| `877feb3` | docs: update PROGRESS.md — Phase 5 complete, Phase 6 plan |
| `066946f` | docs: comprehensive README, sample documents, seed script |
| `bd6e3d7` | chore: render deploy config + CORS + landing page polish |
| `f5768bd` | feat: Phase 6 — README, samples, deploy config, landing page |
