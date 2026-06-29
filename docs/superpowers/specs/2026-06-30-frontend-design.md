# Frontend Design Spec — AI Document Q&A App

**Date:** 2026-06-30
**Phase:** 5 — React/Vite Frontend

---

## 1. Summary

Single-page React/Vite frontend for the AI Document Q&A app. Dark-mode, tech-forward aesthetic targeting portfolio visibility. Command-palette centered layout — full-width chat is the product; all management lives in a slide-in drawer.

---

## 2. Visual Direction

| Token | Value |
|-------|-------|
| Background | `#09090b` (zinc-950) |
| Surface | `#18181b` (zinc-900) |
| Border | `#27272a` (zinc-800) |
| Text primary | `#fafafa` (zinc-50) |
| Text muted | `#a1a1aa` (zinc-400) |
| Accent | `#6366f1` (indigo-500) |
| Accent hover | `#818cf8` (indigo-400) |
| Success | `#22c55e` (green-500) |
| Error | `#ef4444` (red-500) |

**Typography:** Inter (Google Fonts). `text-sm` for UI chrome, `text-base` for messages.

**Component library:** shadcn/ui with zinc base, accent overridden to indigo. Components used: Sheet, Dialog, Badge, ScrollArea, Textarea, Button, Separator, Tooltip.

---

## 3. Layout

Single SPA, no router. Three application states:

```
unauthenticated  →  Login card (centered, zinc-900 card on zinc-950 bg)
authenticated + no session  →  Empty state with "New Session" CTA
authenticated + session active  →  Full chat view
```

### Full chat view chrome

```
┌─────────────────────────────────────────────────────┐
│ ☰  DocuWise                      [Session Title]    │  ← TopBar, h-12
├─────────────────────────────────────────────────────┤
│                                                     │
│              messages scroll here                   │  ← ScrollArea, flex-1
│                                                     │
├─────────────────────────────────────────────────────┤
│  [ Ask anything about your documents...        ↑ ]  │  ← sticky ChatInput
└─────────────────────────────────────────────────────┘
```

Hamburger opens **shadcn Sheet** from left (w-80):

```
┌──────────────────┐
│ DocuWise    [✕]  │
├──────────────────┤
│ + New Session    │
│ ──────────────── │
│ ● Session A      │  ← active = indigo text
│   Session B      │
│   Session C      │
├──────────────────┤
│ DOCUMENTS        │
│ + Upload files   │  ← drag-drop dropzone
│ ──────────────── │
│ ☑ report.pdf  ✓  │  ← checkbox = attached to session
│ ☐ data.csv    ✓  │
│ ☐ brief.docx  ↻  │  ← status: processing
└──────────────────┘
```

No persistent sidebar. Drawer slides in/out — full-width chat at all times.

---

## 4. Component Tree

```
App
├── Login                     (unauthenticated state)
└── Layout
    ├── TopBar                (☰ button, logo, session title)
    ├── SessionDrawer         (shadcn Sheet)
    │   ├── SessionList       (list sessions, create new)
    │   └── DocumentPanel
    │       ├── UploadDropzone  (drag-drop, validates pdf/docx/csv, posts /upload)
    │       └── DocumentItem    (filename, status badge, attach checkbox, summary button)
    └── ChatView
        ├── MessageList       (ScrollArea, auto-scroll to bottom)
        │   ├── UserMessage
        │   └── AssistantMessage
        │       └── CitationChip[]  (indigo badge, tooltip with doc+page)
        ├── StreamingIndicator  (animated dots, shown while SSE active)
        └── ChatInput           (Textarea, Enter sends, Shift+Enter newline, ↑ button)
```

---

## 5. Data Flow & State

**Hooks:**
- `useAuth()` — Supabase session, `signIn(email, password)`, `signOut()`
- `useSession(sessionId)` — messages, attached doc ids, `sendQuestion(q)` (SSE), `attachDocuments(ids)`
- `useDocuments()` — uploaded documents list, `uploadFile(file)`, `requestSummary(docId)`

**SSE streaming pattern:**
```js
const res = await apiFetch(`/sessions/${id}/ask`, { method: "POST", body: ... });
const reader = res.body.getReader();
// append decoded chunks to last assistant message in state
// on stream end, mark message complete
```

**Citation rendering:** each `AssistantMessage` receives `citations: [{document_id, page_number, section}]` resolved to document filename via `useDocuments()` cache. Rendered as indigo `Badge` chips below the message text. Hover tooltip shows full doc name + page.

---

## 6. Key Interactions

| Interaction | Behavior |
|-------------|----------|
| Upload file | Drag onto dropzone or click; client validates extension; POST /upload; show spinner → status badge (ready/error) |
| Attach doc to session | Checkbox in DocumentPanel → POST /sessions/{id}/documents |
| Send question | Enter in ChatInput; user bubble appears immediately; SSE stream appends tokens to assistant bubble; citations appear after stream closes |
| Streaming indicator | Three animated dots replace cursor while stream active |
| Citation chip | Indigo badge: `filename · p.3`; hover tooltip; click copies reference |
| Request summary | Button on DocumentItem → Dialog opens, POST /documents/{id}/summary, show result |
| New session | Button in drawer → POST /sessions, set as active, clear messages |
| Switch session | Click session in list → GET /sessions/{id}, load messages |
| Dark mode | Always dark; no toggle (design is dark-native) |
| Sign out | Available in TopBar (icon button far right) |

---

## 7. Auth Flow

Login screen: email + password form → `supabase.auth.signInWithPassword()`. On success, session stored by Supabase SDK (localStorage). `App.jsx` subscribes to `onAuthStateChange`. No registration screen — team admin creates accounts in Supabase dashboard.

All `apiFetch` calls inject `Authorization: Bearer <access_token>` from current Supabase session.

---

## 8. Error Handling

- Upload errors: badge shows "error" in red, hover reveals message from API
- Ask errors: show inline error message in chat, styled red, dismissible
- Network errors: toast notification (shadcn Sonner or simple custom toast)
- Empty retrieval: API returns "No relevant information found..." — renders as normal assistant message, no citations

---

## 9. File Structure

```
frontend/
  src/
    api/
      client.js           # apiFetch + buildHeaders
    auth/
      supabase.js         # supabase client singleton
      useAuth.js          # auth hook
      Login.jsx
    hooks/
      useSession.js
      useDocuments.js
    components/
      Layout.jsx
      TopBar.jsx
      SessionDrawer.jsx
      SessionList.jsx
      DocumentPanel.jsx
      UploadDropzone.jsx
      DocumentItem.jsx
      ChatView.jsx
      MessageList.jsx
      UserMessage.jsx
      AssistantMessage.jsx
      CitationChip.jsx
      StreamingIndicator.jsx
      ChatInput.jsx
      SummaryDialog.jsx
    App.jsx
    main.jsx
    index.css            # shadcn CSS vars + zinc/indigo theme
  tests/
    client.test.js
    upload.test.jsx
    chat.test.jsx
  package.json
  vite.config.js
  index.html
```

---

## 10. Tech Decisions

- **No react-router** — state machine in App.jsx is sufficient
- **shadcn/ui** — Sheet, Dialog, Badge, ScrollArea, Textarea, Button, Tooltip, Separator
- **Tailwind CSS** — utility-first, shadcn-compatible
- **No Framer Motion** — keep bundle small; CSS transitions suffice for v1
- **Vitest** — component tests with jsdom
- **@supabase/supabase-js** — auth + (optionally) realtime
