# DocuWise — Progress Log
  
> Read this at the start of every session before touching code.

---

## Phase Status

| Phase | Status |
|-------|--------|
| 0 — Backend skeleton + schema | Complete |
| 1 — Chunking, parsing, embeddings | Complete |
| 2 — LLM provider layer (Gemini) | Complete |
| 3 — DB wrappers, RAG, summaries | Complete |
| 4 — Auth + API routes | Complete |
| 5 — React frontend | **IN PROGRESS — bugs fixed, needs live test** |
| 6 — README, deploy, demo | Not started |

---

## Phase 5 — What Works vs What's Broken

### Works
- Login page renders with particle canvas background, framer-motion form entry
- Supabase auth: login/logout functional
- Session creation: `POST /sessions` works, new sessions appear in drawer
- JWT verification: switched to JWKS (`PyJWKClient`) — handles ECC P-256 after Supabase key rotation
- SSE streaming: token parsing fixed, responses render as clean text (not raw `data: {...}`)
- Error messages: `detail` field extracted from JSON error responses
- Document chip: amber-styled filename chip appears above input after upload

### Fixed This Session (commit 8015483)

- **BUG 1 (upload "Failed to fetch"):** `/upload` now returns 202 immediately after storage write. Parse+embed runs in FastAPI `BackgroundTasks`. Frontend polls `GET /documents/{id}` every 2s until `status="ready"` before returning — keeps `uploading=true` the whole time.
- **BUG 2 (no relevant info):** Was caused by BUG 1 — embed never completed. Fixed by BUG 1 fix. Also: delete any stale rows with `status="error"` in Supabase dashboard before re-testing.
- **BUG 4 (uploading state):** Self-healing with the polling approach — `finally` clears `uploading` after poll resolves.
- **COSMETIC (textarea border):** Added `style={{ outline:"none", boxShadow:"none" }}` directly to Textarea.
- **Citations never showed:** SSE `done` event now carries `citations` array; `useSession.js` sets them on the assistant message.
- **Debug console.logs:** Removed from `Layout.jsx`.

### Still Unresolved

#### BUG 3 — New session button intermittently unresponsive
- **Symptom:** Clicking "New session" does nothing visible
- **Likely cause:** 401 from backend (JWKS fetch failure or expired token)
- **Next session:** Reproduce and read the alert message, check uvicorn log

---

## Key Decisions Made This Session

| Decision | Reason |
|----------|--------|
| JWKS-based JWT verification (`auth.py`) | Supabase rotated signing key to ECC P-256; old HS256 secret approach broken permanently |
| `service_role` key in `backend/.env` (not anon key) | Anon key blocked by RLS on Supabase Storage and tables; backend is trusted server-side code |
| UUID prefix on storage paths | Supabase rejects duplicate paths with 409; filename alone not unique enough |
| Two-step upload+attach flow | Backend design: `/upload` stores globally, `/sessions/{id}/documents` links doc to session. Both calls required for RAG to work |
| `uploadAndAttach` wrapper in `Layout.jsx` | `useDocuments` hook has no session context; Layout owns `currentSessionId` and can chain both calls |
| Removed `SUPABASE_JWT_SECRET` dependency | Now unused — JWKS fetches public key directly from Supabase; old env var can stay but does nothing |

---

## Environment — Must Verify at Session Start

### backend/.env
```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<SERVICE_ROLE_KEY>      ← must be service_role, NOT anon
GEMINI_API_KEY=<key>
GEMINI_MODEL=gemini-2.0-flash
LLM_PROVIDER=gemini
```

### frontend/.env.local
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>   ← anon key correct for frontend
VITE_API_URL=http://localhost:8000
```

### Supabase manual setup required
- Storage bucket named `documents` must exist (created in dashboard → Storage → New bucket)
- Tables: `documents`, `chunks`, `sessions`, `messages`, `session_documents` (from `backend/supabase_schema.sql`)
- `match_chunks` RPC (pgvector cosine search) — in the schema SQL

---

## Uncommitted Changes (not yet in git)

These files changed after last commit (`fe29269`) and are NOT committed:

| File | What changed |
|------|-------------|
| `backend/app/auth.py` | Switched to JWKS verification (PyJWKClient), removed HS256 |
| `backend/app/routers/documents.py` | Added `import uuid`, UUID prefix on storage path |
| `frontend/src/hooks/useSession.js` | SSE line parser (token accumulation), JSON error detail extraction |
| `frontend/src/hooks/useDocuments.js` | `uploadFile` now returns `document_id` |
| `frontend/src/components/Layout.jsx` | `uploadAndAttach` function, `apiFetch` import, error handling on `handleNewSession`, debug `console.log` calls |
| `frontend/src/components/ChatView.jsx` | Amber doc chips, `onUpload`/`uploading` props wired |
| `frontend/src/components/ChatInput.jsx` | Paperclip button, async `handleFile`, `outline-none`, border style |
| `frontend/src/components/EmptyState.jsx` | Framer-motion, amber icon ring |
| `frontend/src/components/UserMessage.jsx` | Framer-motion slide-in |
| `frontend/src/components/AssistantMessage.jsx` | Framer-motion slide-in, amber border |
| `frontend/src/components/ui/ParticleCanvas.jsx` | New file — physics particle canvas |
| `frontend/src/auth/Login.jsx` | Particle bg, motion form, clean wordmark |
| `frontend/src/index.css` | Amber theme tokens, OLED background |
| `frontend/index.html` | Plus Jakarta Sans font |

**Commit all of these at next session start before doing any other work.**

---

## What Next Session Should Do First

1. **Delete stale document rows** — Supabase dashboard → Table Editor → `documents` table → delete rows with `status="error"` or where `chunks` count is 0
2. **Test full flow:** start backend (`uvicorn app.main:app --reload` from `backend/`) + frontend (`npm run dev` from `frontend/`) → login → new session → upload PDF → watch "Uploading…" persist until embed completes → ask question → verify answer + citations appear
3. **If still "No relevant info":** check `chunks` table in Supabase — rows should appear with `document_id` matching the uploaded doc. If empty, check uvicorn terminal for BackgroundTask errors.
4. **If BUG 3 (new session) reproduces:** read the alert message and paste it here for diagnosis
5. **Move to Phase 6** once full Q&A flow confirmed end-to-end
