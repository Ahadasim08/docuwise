# Context for Claude — DocuWise LinkedIn Launch

## What this project is

**DocuWise** — a private document Q&A tool ("ChatGPT for your own files"). Teams upload PDFs, Word docs, and CSVs, ask questions in plain English, and get AI answers with source citations (document + page/section), plus on-demand summaries. Built to replace the "search the folder, open the file, skim for the answer" workflow.

Target users: internal knowledge workers — employees, analysts, ops teams — who need fast, trustworthy answers from documents they already own, with answers they can verify in seconds (not trust blindly).

## Architecture

```
React (Vite) ──HTTP──> FastAPI backend ──> Supabase (Postgres + pgvector, Auth, Storage)
                              └──> LLM provider (Groq, llama-3.3-70b-versatile)
```

- **Frontend:** React + Vite, Tailwind, shadcn/ui, streaming chat via SSE, markdown rendering, dark mode, landing page before login
- **Backend:** FastAPI, layered into routers/services/db/llm — pluggable LLM provider (swapped Gemini → Groq due to regional quota issue)
- **RAG pipeline:** parse (pypdf/python-docx/pandas) → chunk → embed (sentence-transformers, local, 384-dim) → pgvector cosine search (`match_chunks` RPC) → grounded LLM prompt → streamed answer with citations
- **Auth:** Supabase JWT (JWKS verification), single shared team login (no per-user isolation in v1)
- **Hosting target:** Render (Blueprint config written, deploy not yet executed)

## What's been built — full status

| Phase | Status |
|---|---|
| 0 — Backend skeleton + Supabase schema | ✅ Complete |
| 1 — Parsing, chunking, embeddings | ✅ Complete |
| 2 — LLM provider layer (Gemini + Groq, swappable) | ✅ Complete |
| 3 — DB wrappers, RAG, summaries | ✅ Complete |
| 4 — Auth + API routes (upload/sessions/ask streaming) | ✅ Complete |
| 5 — React frontend (auth, upload, chat+streaming+citations, summary, dark mode) | ✅ Complete |
| 6 — README, sample docs, Render deploy config, demo video, landing page | ✅ Complete — tagged `v1.0` |

Full end-to-end flow verified manually: login → new session → upload document → ask question → streaming answer with citations → summary. Per-document source selector (toggle which docs are queried). Sessions auto-rename from first question. GitHub repo live: `https://github.com/Ahadasim08/docuwise`.

### Key technical decisions made along the way
- Switched LLM provider from Gemini to **Groq** — Gemini free tier returned `limit: 0` in this region, permanently broken
- Switched pgvector index from IVFFlat to **HNSW** — IVFFlat missed results entirely on a small dataset
- Embeddings sent to Supabase as a **string-encoded vector** (`"[v1,v2,…]"`) — supabase-py can't cast a JSON array directly to `vector(384)`
- Upload returns `202` immediately; embedding happens in a FastAPI `BackgroundTask`, frontend polls document status
- Backend uses Supabase **service role key** (anon key is blocked by RLS on storage + tables)

### Remaining technical work (not blocking the LinkedIn post)
- Demo video recorded (~22s, background music added with ffmpeg) — done
- Render deploy not yet executed (config exists, account/env vars not yet set)
- README not yet updated with live deploy URL

## What's left — THE CURRENT GOAL

The app is feature-complete (`v1.0`) and a demo video with background music has already been produced. **The only remaining task is to publish this on LinkedIn** to showcase the project for job/internship/freelance opportunities.

Specifically still needed:
1. Final caption copy (a draft exists — see below — may want sharper hook lines or shorter variants)
2. Best posting time guidance (Tue–Thu, 8–10am or 12–1pm local audience time)
3. Posting mechanics: native video upload (not YouTube link), GitHub link in first comment instead of post body, "open to work" framing
4. Optional: 2–3 alternate first-line hooks to A/B think about, since LinkedIn truncates posts after the first line

## Draft caption already written (for reference/iteration)

```
Built DocuWise — a private "ChatGPT for your own files."

Upload PDFs, Word docs, CSVs → ask questions in plain English → get answers with exact source citations (document + page).

The problem: teams burn hours searching folders, opening files, skimming for one fact. DocuWise turns that into a single conversation — and every answer traces back to a real source, so you can verify it in seconds instead of trusting a black box.

Stack:
→ React + Vite frontend, streaming chat (SSE)
→ FastAPI backend
→ Supabase (Postgres + pgvector) for storage + auth
→ RAG pipeline: chunking → embeddings (sentence-transformers) → vector search → grounded LLM answers (Groq)

Built it end-to-end — schema design, auth, retrieval pipeline, streaming UI, citation tracking.

Demo below 👇

Open to internships / roles / freelance work where I can build things like this. Always happy to talk shop — comment or DM.

#buildinpublic #softwareengineering #RAG #fullstackdevelopment #opentowork #AI
```

## What I want from you (Claude)

Help me finalize and ship this LinkedIn post: sharpen the caption/hook, suggest the best time to post for my situation, and tell me exactly how to structure the post (video, first comment, hashtags, tagging) to maximize visibility to recruiters and potential clients.
