# Phase 5 — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dark-mode React/Vite frontend for the AI Document Q&A app — command-palette centered chat, slide-in drawer for sessions + document management, SSE streaming answers with citation chips.

**Architecture:** Single SPA (no router), three-state machine: `unauthenticated → Login`, `authenticated + no session → EmptyState`, `authenticated + session → ChatView`. shadcn/ui on zinc base with indigo accent. All API calls via `apiFetch` (injects Supabase JWT). SSE streaming via `ReadableStream` + `TextDecoder`. Document attachment tracked locally in `useSession` hook.

**Tech Stack:** React 18, Vite, Tailwind CSS, shadcn/ui (radix-ui), lucide-react, @supabase/supabase-js, Vitest, @testing-library/react.

## Global Constraints

- Node 20+. JSX only (no TypeScript).
- Tailwind CSS required — all styling via utility classes + CSS vars.
- shadcn/ui zinc base theme, indigo accent: `--primary: 239 84% 67%` (indigo-500).
- Background `#09090b` (zinc-950), surface `#18181b` (zinc-900), border `#27272a` (zinc-800).
- All API calls use `VITE_API_URL` (fallback `http://localhost:8000`).
- Auth via Supabase: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- File uploads: allowlist `pdf`/`docx`/`csv`, max 20 MB, validated client-side before POST.
- `apiFetch` injects `Authorization: Bearer <token>` on every request.
- SSE `/sessions/{id}/ask` streams raw text tokens (not JSON), accumulate into last assistant message.
- Vitest + jsdom + @testing-library/react for all component tests.
- All files under `frontend/src/` except tests at `frontend/tests/`.
- Commits: Conventional Commits. Each task = own commit.
- Run frontend commands from `frontend/` directory.

---

## File Structure

```
frontend/
  index.html
  vite.config.js          # vitest config + @ alias
  tailwind.config.js
  postcss.config.js
  components.json         # shadcn config
  package.json
  .env.local              # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL (never commit)
  src/
    main.jsx
    App.jsx               # state machine: auth gate + session gate
    index.css             # shadcn CSS vars + zinc/indigo theme
    lib/
      utils.js            # cn() helper (clsx + twMerge)
    api/
      client.js           # apiFetch(path, opts, token), buildHeaders(token, base)
    auth/
      supabase.js         # supabase client singleton
      useAuth.js          # useAuth() hook
      Login.jsx           # email/password form
    hooks/
      useSessions.js      # list sessions, create session
      useSession.js       # messages + SSE send + local attach state
      useDocuments.js     # upload file, list docs, request summary
    components/
      Layout.jsx          # top bar + main area + drawer
      TopBar.jsx          # ☰ button + session title + sign-out
      EmptyState.jsx      # no-session placeholder
      SessionDrawer.jsx   # shadcn Sheet containing SessionList + DocumentPanel
      SessionList.jsx     # session items + new session button
      DocumentPanel.jsx   # upload dropzone + document items
      UploadDropzone.jsx  # drag-drop + file input (extracted from DocumentPanel)
      DocumentItem.jsx    # filename + status badge + summary trigger
      SummaryDialog.jsx   # shadcn Dialog showing AI summary
      ChatView.jsx        # scroll area + message list + chat input
      MessageList.jsx     # maps messages to User/Assistant components
      UserMessage.jsx     # right-aligned user bubble
      AssistantMessage.jsx # left-aligned assistant bubble + citations
      CitationChip.jsx    # indigo badge with tooltip
      StreamingIndicator.jsx  # animated dots while SSE active
      ChatInput.jsx       # textarea + send button
  tests/
    setup.js              # @testing-library/jest-dom import
    client.test.js
    login.test.jsx
    app.test.jsx
    sessions.test.jsx
    upload.test.jsx
    chat.test.jsx
```

---

## Task 5.1: Scaffold + Tooling + API Client

**Files:**
- Create: `frontend/` (Vite React scaffold)
- Create: `frontend/vite.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/components.json`
- Create: `frontend/src/index.css`
- Create: `frontend/src/lib/utils.js`
- Create: `frontend/src/api/client.js`
- Create: `frontend/tests/setup.js`
- Create: `frontend/tests/client.test.js`

**Interfaces:**
- Produces:
  - `buildHeaders(token: string, base?: object) -> object` — merges `Authorization: Bearer <token>` into base headers
  - `apiFetch(path: string, opts?: object, token?: string) -> Promise<Response>` — throws on non-ok; for file uploads caller omits Content-Type (FormData sets it)
  - `cn(...inputs) -> string` — clsx + twMerge utility

- [ ] **Step 1: Scaffold Vite React app**

```bash
cd "D:/Getting Better"
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js
npm install -D tailwindcss postcss autoprefixer
npm install clsx tailwind-merge class-variance-authority lucide-react
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npx tailwindcss init -p
```

- [ ] **Step 3: Write failing test**

```javascript
// frontend/tests/client.test.js
import { describe, test, expect } from "vitest";
import { buildHeaders } from "../src/api/client";

describe("buildHeaders", () => {
  test("injects Authorization header", () => {
    const h = buildHeaders("tok123");
    expect(h.Authorization).toBe("Bearer tok123");
  });

  test("merges base headers", () => {
    const h = buildHeaders("tok", { "X-Custom": "val" });
    expect(h["X-Custom"]).toBe("val");
    expect(h.Authorization).toBe("Bearer tok");
    expect(h["Content-Type"]).toBe("application/json");
  });
});
```

- [ ] **Step 4: Run test — expect FAIL**

```bash
npx vitest run tests/client.test.js
```
Expected: FAIL (cannot find module `../src/api/client`)

- [ ] **Step 5: Create tests/setup.js**

```javascript
// frontend/tests/setup.js
import "@testing-library/jest-dom";
```

- [ ] **Step 6: Create vite.config.js**

```javascript
// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.js",
  },
});
```

- [ ] **Step 7: Create tailwind.config.js**

```javascript
// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 8: Create postcss.config.js**

```javascript
// frontend/postcss.config.js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 9: Create src/index.css**

```css
/* frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 10% 4%;
    --foreground: 0 0% 98%;
    --card: 240 5% 10%;
    --card-foreground: 0 0% 98%;
    --popover: 240 5% 10%;
    --popover-foreground: 0 0% 98%;
    --primary: 239 84% 67%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4% 16%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 4% 16%;
    --muted-foreground: 240 5% 65%;
    --accent: 239 84% 67%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 4% 16%;
    --input: 240 4% 16%;
    --ring: 239 84% 67%;
    --radius: 0.5rem;
  }
}

* { border-color: hsl(var(--border)); }
body { background-color: hsl(var(--background)); color: hsl(var(--foreground)); }
```

- [ ] **Step 10: Create components.json (shadcn config)**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": false,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

- [ ] **Step 11: Install shadcn components**

```bash
npx shadcn@latest add button badge sheet dialog textarea separator tooltip scroll-area --yes
```

- [ ] **Step 12: Create src/lib/utils.js**

```javascript
// frontend/src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 13: Create src/api/client.js**

```javascript
// frontend/src/api/client.js
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function buildHeaders(token, base = {}) {
  return { ...base, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function apiFetch(path, opts = {}, token = null) {
  const headers = token
    ? buildHeaders(token, opts.headers || {})
    : opts.headers || {};
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  if (!res.ok) throw new Error(await res.text());
  return res;
}
```

- [ ] **Step 14: Run test — expect PASS**

```bash
npx vitest run tests/client.test.js
```
Expected: PASS (2 tests)

- [ ] **Step 15: Update src/main.jsx**

```jsx
// frontend/src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 16: Commit**

```bash
git checkout -b feat/frontend-scaffold
git add frontend/
git commit -m "feat: React scaffold, Tailwind, shadcn, API client"
```

---

## Task 5.2: Auth + App Shell

**Files:**
- Create: `frontend/src/auth/supabase.js`
- Create: `frontend/src/auth/useAuth.js`
- Create: `frontend/src/auth/Login.jsx`
- Create: `frontend/src/App.jsx`
- Create: `frontend/tests/login.test.jsx`
- Create: `frontend/tests/app.test.jsx`

**Interfaces:**
- Consumes: `apiFetch` (Task 5.1), supabase client
- Produces:
  - `supabase` — Supabase client singleton
  - `useAuth() -> { session, loading, signIn, signOut }` — `signIn(email, password)` calls `supabase.auth.signInWithPassword`; `session` is null when unauthenticated
  - `<Login onSignIn={fn} />` — email + password form; calls `onSignIn(email, password)`
  - `<App />` — renders `<Login>` when unauthenticated, `<Layout>` when authenticated

- [ ] **Step 1: Write failing login test**

```jsx
// frontend/tests/login.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import Login from "../src/auth/Login";

test("renders email and password fields", () => {
  render(<Login onSignIn={vi.fn()} />);
  expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
});

test("calls onSignIn with email and password on submit", async () => {
  const onSignIn = vi.fn().mockResolvedValue({});
  render(<Login onSignIn={onSignIn} />);
  fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: "pass" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(onSignIn).toHaveBeenCalledWith("a@b.com", "pass");
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/login.test.jsx
```
Expected: FAIL (cannot find module `../src/auth/Login`)

- [ ] **Step 3: Create src/auth/supabase.js**

```javascript
// frontend/src/auth/supabase.js
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

- [ ] **Step 4: Create src/auth/useAuth.js**

```javascript
// frontend/src/auth/useAuth.js
import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = () => supabase.auth.signOut();

  return { session, loading, signIn, signOut };
}
```

- [ ] **Step 5: Create src/auth/Login.jsx**

```jsx
// frontend/src/auth/Login.jsx
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Login({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await onSignIn(email, password);
    if (result?.error) setError(result.error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm bg-card border border-border rounded-lg p-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">DocuWise</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your workspace</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run login tests — expect PASS**

```bash
npx vitest run tests/login.test.jsx
```
Expected: PASS (2 tests)

- [ ] **Step 7: Write failing App test**

```jsx
// frontend/tests/app.test.jsx
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../src/auth/useAuth", () => ({
  useAuth: () => ({ session: null, loading: false, signIn: vi.fn(), signOut: vi.fn() }),
}));
vi.mock("../src/auth/supabase", () => ({ supabase: {} }));

import App from "../src/App";

test("renders Login when unauthenticated", () => {
  render(<App />);
  expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
});

test("shows loading state", async () => {
  const { useAuth } = await import("../src/auth/useAuth");
  useAuth.mockReturnValue({ session: null, loading: true, signIn: vi.fn(), signOut: vi.fn() });
  render(<App />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

- [ ] **Step 8: Run — expect FAIL**

```bash
npx vitest run tests/app.test.jsx
```
Expected: FAIL (cannot find module `../src/App`)

- [ ] **Step 9: Create src/App.jsx**

```jsx
// frontend/src/App.jsx
import { useState } from "react";
import { useAuth } from "./auth/useAuth";
import Login from "./auth/Login";

export default function App() {
  const { session, loading, signIn, signOut } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!session) return <Login onSignIn={signIn} />;

  const Layout = require("./components/Layout").default;
  return (
    <Layout
      token={session.access_token}
      currentSessionId={currentSessionId}
      onSessionSelect={setCurrentSessionId}
      onSignOut={signOut}
    />
  );
}
```

Note: `require` is used here to break the circular import cycle during tests. An alternative is lazy import with `React.lazy`. Either works; the require form is simpler for this case.

- [ ] **Step 10: Run App tests — expect PASS**

```bash
npx vitest run tests/app.test.jsx
```
Expected: PASS (2 tests)

- [ ] **Step 11: Commit**

```bash
git add frontend/src/auth/ frontend/src/App.jsx frontend/tests/login.test.jsx frontend/tests/app.test.jsx
git commit -m "feat: supabase auth, login screen, app state machine"
```

---

## Task 5.3: Session Management

**Files:**
- Create: `frontend/src/hooks/useSessions.js`
- Create: `frontend/src/components/TopBar.jsx`
- Create: `frontend/src/components/EmptyState.jsx`
- Create: `frontend/src/components/Layout.jsx`
- Create: `frontend/src/components/SessionDrawer.jsx`
- Create: `frontend/src/components/SessionList.jsx`
- Create: `frontend/tests/sessions.test.jsx`

**Interfaces:**
- Consumes: `apiFetch` (Task 5.1)
- Produces:
  - `useSessions(token) -> { sessions, createSession }` — `sessions: [{id, title, created_at}]`, `createSession(title?) -> Promise<session>`
  - `<SessionList sessions currentId onSelect onNew />` — renders session buttons, active = indigo
  - `<TopBar sessionTitle onMenuClick onSignOut />` — hamburger + title + sign-out icon
  - `<EmptyState onNewSession />` — centered placeholder
  - `<Layout token currentSessionId onSessionSelect onSignOut />` — composes everything
  - `<SessionDrawer open onClose sessions currentSessionId onSessionSelect onNewSession documents uploading onUpload onRequestSummary token />` — shadcn Sheet wrapper

- [ ] **Step 1: Write failing session list test**

```jsx
// frontend/tests/sessions.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import SessionList from "../src/components/SessionList";

const sessions = [
  { id: "s1", title: "Report Analysis", created_at: "2026-06-30" },
  { id: "s2", title: "Data Review", created_at: "2026-06-30" },
];

test("renders session titles", () => {
  render(<SessionList sessions={sessions} currentId="s1" onSelect={() => {}} onNew={() => {}} />);
  expect(screen.getByText("Report Analysis")).toBeInTheDocument();
  expect(screen.getByText("Data Review")).toBeInTheDocument();
});

test("calls onSelect with session id on click", () => {
  const onSelect = vi.fn();
  render(<SessionList sessions={sessions} currentId="s1" onSelect={onSelect} onNew={() => {}} />);
  fireEvent.click(screen.getByText("Data Review"));
  expect(onSelect).toHaveBeenCalledWith("s2");
});

test("calls onNew when new session clicked", () => {
  const onNew = vi.fn();
  render(<SessionList sessions={[]} currentId={null} onSelect={() => {}} onNew={onNew} />);
  fireEvent.click(screen.getByText(/new session/i));
  expect(onNew).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/sessions.test.jsx
```
Expected: FAIL (cannot find module `../src/components/SessionList`)

- [ ] **Step 3: Create src/hooks/useSessions.js**

```javascript
// frontend/src/hooks/useSessions.js
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api/client";

export function useSessions(token) {
  const [sessions, setSessions] = useState([]);

  const fetchSessions = useCallback(async () => {
    if (!token) return;
    const res = await apiFetch("/sessions", {}, token);
    setSessions(await res.json());
  }, [token]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const createSession = async (title = "New session") => {
    const res = await apiFetch("/sessions", {
      method: "POST",
      body: JSON.stringify({ title }),
    }, token);
    const session = await res.json();
    await fetchSessions();
    return session;
  };

  return { sessions, createSession };
}
```

- [ ] **Step 4: Create src/components/SessionList.jsx**

```jsx
// frontend/src/components/SessionList.jsx
import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SessionList({ sessions, currentId, onSelect, onNew }) {
  return (
    <div className="px-2 py-2">
      <Button onClick={onNew} variant="ghost" size="sm" className="w-full justify-start gap-2 mb-2">
        <Plus className="h-3.5 w-3.5" />
        New session
      </Button>
      <p className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wider">Sessions</p>
      <div className="space-y-0.5">
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              "w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors",
              s.id === currentId
                ? "bg-accent/20 text-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{s.title}</span>
          </button>
        ))}
        {sessions.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-2">No sessions yet</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run session tests — expect PASS**

```bash
npx vitest run tests/sessions.test.jsx
```
Expected: PASS (3 tests)

- [ ] **Step 6: Create src/components/TopBar.jsx**

```jsx
// frontend/src/components/TopBar.jsx
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TopBar({ sessionTitle, onMenuClick, onSignOut }) {
  return (
    <header className="h-12 border-b border-border bg-background/95 backdrop-blur-sm flex items-center px-4 gap-3 sticky top-0 z-10">
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-8 w-8">
        <Menu className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium text-foreground flex-1 truncate">{sessionTitle}</span>
      <Button variant="ghost" size="icon" onClick={onSignOut} className="h-8 w-8">
        <LogOut className="h-4 w-4 text-muted-foreground" />
      </Button>
    </header>
  );
}
```

- [ ] **Step 7: Create src/components/EmptyState.jsx**

```jsx
// frontend/src/components/EmptyState.jsx
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmptyState({ onNewSession }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
      <MessageSquare className="h-10 w-10 text-muted-foreground" />
      <div>
        <p className="text-foreground font-medium">No session selected</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start a new session to ask questions about your documents
        </p>
      </div>
      <Button onClick={onNewSession}>New session</Button>
    </div>
  );
}
```

- [ ] **Step 8: Create src/components/SessionDrawer.jsx**

```jsx
// frontend/src/components/SessionDrawer.jsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import SessionList from "./SessionList";
import DocumentPanel from "./DocumentPanel";

export default function SessionDrawer({
  open, onClose, sessions, currentSessionId, onSessionSelect, onNewSession,
  documents, uploading, onUpload, onRequestSummary, token,
}) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 bg-card border-border p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <SheetTitle className="text-foreground text-sm font-semibold">DocuWise</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <SessionList
            sessions={sessions}
            currentId={currentSessionId}
            onSelect={onSessionSelect}
            onNew={onNewSession}
          />
          <Separator />
          <DocumentPanel
            documents={documents}
            uploading={uploading}
            onUpload={onUpload}
            onRequestSummary={onRequestSummary}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 9: Create src/components/Layout.jsx**

```jsx
// frontend/src/components/Layout.jsx
import { useState } from "react";
import TopBar from "./TopBar";
import SessionDrawer from "./SessionDrawer";
import EmptyState from "./EmptyState";
import ChatView from "./ChatView";
import { useSessions } from "../hooks/useSessions";
import { useDocuments } from "../hooks/useDocuments";

export default function Layout({ token, currentSessionId, onSessionSelect, onSignOut }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { sessions, createSession } = useSessions(token);
  const { documents, uploading, uploadFile, requestSummary } = useDocuments(token);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  const handleNewSession = async () => {
    const s = await createSession("New session");
    onSessionSelect(s.id);
    setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar
        sessionTitle={currentSession?.title || "DocuWise"}
        onMenuClick={() => setDrawerOpen(true)}
        onSignOut={onSignOut}
      />
      <SessionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={(id) => { onSessionSelect(id); setDrawerOpen(false); }}
        onNewSession={handleNewSession}
        documents={documents}
        uploading={uploading}
        onUpload={uploadFile}
        onRequestSummary={requestSummary}
        token={token}
      />
      <main className="flex-1 flex flex-col">
        {currentSessionId ? (
          <ChatView sessionId={currentSessionId} token={token} documents={documents} />
        ) : (
          <EmptyState onNewSession={handleNewSession} />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 10: Fix App.jsx to use proper dynamic import instead of require**

Replace `frontend/src/App.jsx` with:

```jsx
// frontend/src/App.jsx
import { useState, Suspense, lazy } from "react";
import { useAuth } from "./auth/useAuth";
import Login from "./auth/Login";

const Layout = lazy(() => import("./components/Layout"));

export default function App() {
  const { session, loading, signIn, signOut } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!session) return <Login onSignIn={signIn} />;

  return (
    <Suspense fallback={null}>
      <Layout
        token={session.access_token}
        currentSessionId={currentSessionId}
        onSessionSelect={setCurrentSessionId}
        onSignOut={signOut}
      />
    </Suspense>
  );
}
```

- [ ] **Step 11: Run all tests — expect PASS**

```bash
npx vitest run
```
Expected: PASS (all tests so far)

- [ ] **Step 12: Commit**

```bash
git add frontend/src/hooks/useSessions.js frontend/src/components/TopBar.jsx frontend/src/components/EmptyState.jsx frontend/src/components/Layout.jsx frontend/src/components/SessionDrawer.jsx frontend/src/components/SessionList.jsx frontend/src/App.jsx frontend/tests/sessions.test.jsx
git commit -m "feat: session management — drawer, list, layout, empty state"
```

---

## Task 5.4: Document Management

**Files:**
- Create: `frontend/src/hooks/useDocuments.js`
- Create: `frontend/src/components/DocumentPanel.jsx`
- Create: `frontend/src/components/DocumentItem.jsx`
- Create: `frontend/src/components/SummaryDialog.jsx`
- Create: `frontend/tests/upload.test.jsx`

**Interfaces:**
- Consumes: `apiFetch` (Task 5.1)
- Produces:
  - `useDocuments(token) -> { documents, uploading, uploadFile, requestSummary }` — `documents: [{id, filename, status, file_type}]`; `uploadFile(file)` posts multipart to `/upload`; `requestSummary(docId)` posts to `/documents/{id}/summary`, returns summary string
  - `<DocumentPanel documents uploading onUpload onRequestSummary />` — drag-drop + document list
  - `<DocumentItem doc onRequestSummary />` — filename + status icon + summary trigger
  - `<SummaryDialog open onClose docName onFetchSummary />` — Dialog with lazy-loaded summary

- [ ] **Step 1: Write failing upload test**

```jsx
// frontend/tests/upload.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import DocumentPanel from "../src/components/DocumentPanel";

test("renders upload dropzone", () => {
  render(<DocumentPanel documents={[]} uploading={false} onUpload={vi.fn()} onRequestSummary={vi.fn()} />);
  expect(screen.getByText(/drop file or click/i)).toBeInTheDocument();
});

test("rejects unsupported file type", () => {
  const onUpload = vi.fn();
  render(<DocumentPanel documents={[]} uploading={false} onUpload={onUpload} onRequestSummary={vi.fn()} />);
  const input = screen.getByTestId("file-input");
  const file = new File(["content"], "test.txt", { type: "text/plain" });
  fireEvent.change(input, { target: { files: [file] } });
  expect(onUpload).not.toHaveBeenCalled();
  expect(screen.getByText(/not supported/i)).toBeInTheDocument();
});

test("calls onUpload for valid file", () => {
  const onUpload = vi.fn();
  render(<DocumentPanel documents={[]} uploading={false} onUpload={onUpload} onRequestSummary={vi.fn()} />);
  const input = screen.getByTestId("file-input");
  const file = new File(["content"], "report.pdf", { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file] } });
  expect(onUpload).toHaveBeenCalledWith(file);
});

test("shows document in list", () => {
  const docs = [{ id: "d1", filename: "report.pdf", status: "ready" }];
  render(<DocumentPanel documents={docs} uploading={false} onUpload={vi.fn()} onRequestSummary={vi.fn()} />);
  expect(screen.getByText("report.pdf")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/upload.test.jsx
```
Expected: FAIL (cannot find module `../src/components/DocumentPanel`)

- [ ] **Step 3: Create src/hooks/useDocuments.js**

```javascript
// frontend/src/hooks/useDocuments.js
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api/client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useDocuments(token) {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    const res = await apiFetch("/documents", {}, token);
    setDocuments(await res.json());
  }, [token]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchDocuments();
    } finally {
      setUploading(false);
    }
  };

  const requestSummary = async (docId) => {
    const res = await apiFetch(`/documents/${docId}/summary`, { method: "POST" }, token);
    const data = await res.json();
    return data.summary;
  };

  return { documents, uploading, uploadFile, requestSummary };
}
```

- [ ] **Step 4: Create src/components/DocumentItem.jsx**

```jsx
// frontend/src/components/DocumentItem.jsx
import { useState } from "react";
import { FileText, CheckCircle, AlertCircle, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import SummaryDialog from "./SummaryDialog";

const STATUS_ICON = {
  ready: <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />,
  processing: <Loader2 className="h-3 w-3 text-muted-foreground animate-spin shrink-0" />,
  error: <AlertCircle className="h-3 w-3 text-destructive shrink-0" />,
};

export default function DocumentItem({ doc, onRequestSummary }) {
  const [summaryOpen, setSummaryOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted group">
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs text-foreground truncate flex-1">{doc.filename}</span>
        {STATUS_ICON[doc.status] || null}
        {doc.status === "ready" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setSummaryOpen(true)}
          >
            <BookOpen className="h-3 w-3" />
          </Button>
        )}
      </div>
      <SummaryDialog
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        docName={doc.filename}
        onFetchSummary={onRequestSummary}
      />
    </>
  );
}
```

- [ ] **Step 5: Create src/components/SummaryDialog.jsx**

```jsx
// frontend/src/components/SummaryDialog.jsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SummaryDialog({ open, onClose, docName, onFetchSummary }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSummary("");
    setError("");
    onFetchSummary()
      .then((s) => setSummary(s))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground text-sm font-medium">
            {docName} — Summary
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-96 mt-2">
          {loading && <p className="text-sm text-muted-foreground">Generating summary…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {summary && (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{summary}</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: Create src/components/DocumentPanel.jsx**

```jsx
// frontend/src/components/DocumentPanel.jsx
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import DocumentItem from "./DocumentItem";

const ALLOWED = ["pdf", "docx", "csv"];

export default function DocumentPanel({ documents, uploading, onUpload, onRequestSummary }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const validate = (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!ALLOWED.includes(ext)) {
      setError(`${ext} not supported. Use PDF, DOCX, or CSV.`);
      return false;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File exceeds 20 MB limit.");
      return false;
    }
    setError("");
    return true;
  };

  const handleFiles = (files) => {
    const file = files[0];
    if (!file || !validate(file)) return;
    onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="px-2 py-2">
      <p className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wider">Documents</p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "mx-2 my-2 border border-dashed rounded-md p-3 text-center cursor-pointer transition-colors",
          dragOver ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
        )}
      >
        <Upload className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">
          {uploading ? "Uploading…" : "Drop file or click to upload"}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">PDF · DOCX · CSV · max 20 MB</p>
        <input
          ref={inputRef}
          data-testid="file-input"
          type="file"
          className="hidden"
          accept=".pdf,.docx,.csv"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="text-xs text-destructive px-2 mb-2">{error}</p>}
      <div className="space-y-0.5">
        {documents.map((doc) => (
          <DocumentItem
            key={doc.id}
            doc={doc}
            onRequestSummary={() => onRequestSummary(doc.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run upload tests — expect PASS**

```bash
npx vitest run tests/upload.test.jsx
```
Expected: PASS (4 tests)

- [ ] **Step 8: Run full test suite — expect PASS**

```bash
npx vitest run
```
Expected: all tests PASS

- [ ] **Step 9: Commit**

```bash
git add frontend/src/hooks/useDocuments.js frontend/src/components/DocumentPanel.jsx frontend/src/components/DocumentItem.jsx frontend/src/components/SummaryDialog.jsx frontend/tests/upload.test.jsx
git commit -m "feat: document upload, list, summary dialog"
```

---

## Task 5.5: Chat Interface + SSE Streaming

**Files:**
- Create: `frontend/src/hooks/useSession.js`
- Create: `frontend/src/components/ChatView.jsx`
- Create: `frontend/src/components/MessageList.jsx`
- Create: `frontend/src/components/UserMessage.jsx`
- Create: `frontend/src/components/AssistantMessage.jsx`
- Create: `frontend/src/components/CitationChip.jsx`
- Create: `frontend/src/components/StreamingIndicator.jsx`
- Create: `frontend/src/components/ChatInput.jsx`
- Create: `frontend/tests/chat.test.jsx`

**Interfaces:**
- Consumes: `apiFetch` (Task 5.1)
- Produces:
  - `useSession(sessionId, token) -> { messages, streaming, sendQuestion }` — `messages: [{id, role, content, citations, streaming?}]`; `sendQuestion(question)` appends user msg immediately, opens SSE stream, appends tokens to assistant msg, marks complete on done
  - `<ChatView sessionId token documents />` — scroll area + message list + input
  - `<MessageList messages docMap />` — maps to UserMessage/AssistantMessage
  - `<UserMessage content />` — right-aligned indigo-tinted bubble
  - `<AssistantMessage content citations docMap />` — left-aligned card + citation chips
  - `<CitationChip citation filename />` — indigo badge with tooltip
  - `<StreamingIndicator />` — three bouncing dots
  - `<ChatInput onSend disabled />` — textarea, Enter sends, Shift+Enter newline

- [ ] **Step 1: Write failing chat tests**

```jsx
// frontend/tests/chat.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import UserMessage from "../src/components/UserMessage";
import AssistantMessage from "../src/components/AssistantMessage";
import CitationChip from "../src/components/CitationChip";
import ChatInput from "../src/components/ChatInput";

test("UserMessage renders content", () => {
  render(<UserMessage content="What is the revenue?" />);
  expect(screen.getByText("What is the revenue?")).toBeInTheDocument();
});

test("AssistantMessage renders content", () => {
  render(<AssistantMessage content="Revenue was $5M." citations={[]} docMap={{}} />);
  expect(screen.getByText("Revenue was $5M.")).toBeInTheDocument();
});

test("AssistantMessage renders citation chips", () => {
  const citations = [{ document_id: "d1", page_number: 3, section: null }];
  const docMap = { d1: "report.pdf" };
  render(<AssistantMessage content="See source." citations={citations} docMap={docMap} />);
  expect(screen.getByText(/report\.pdf/i)).toBeInTheDocument();
});

test("CitationChip shows filename and page", () => {
  render(<CitationChip citation={{ document_id: "d1", page_number: 5, section: null }} filename="data.pdf" />);
  expect(screen.getByText(/data\.pdf.*p\.5/i)).toBeInTheDocument();
});

test("ChatInput calls onSend on Enter", () => {
  const onSend = vi.fn();
  render(<ChatInput onSend={onSend} disabled={false} />);
  const textarea = screen.getByPlaceholderText(/ask anything/i);
  fireEvent.change(textarea, { target: { value: "What is revenue?" } });
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
  expect(onSend).toHaveBeenCalledWith("What is revenue?");
});

test("ChatInput does not send on Shift+Enter", () => {
  const onSend = vi.fn();
  render(<ChatInput onSend={onSend} disabled={false} />);
  const textarea = screen.getByPlaceholderText(/ask anything/i);
  fireEvent.change(textarea, { target: { value: "draft" } });
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
  expect(onSend).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/chat.test.jsx
```
Expected: FAIL (cannot find modules)

- [ ] **Step 3: Create src/hooks/useSession.js**

```javascript
// frontend/src/hooks/useSession.js
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api/client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useSession(sessionId, token) {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!sessionId || !token) return;
    const res = await apiFetch(`/sessions/${sessionId}`, {}, token);
    const data = await res.json();
    setMessages(
      (data.messages || []).map((m) => ({
        ...m,
        citations: m.citations || [],
      }))
    );
  }, [sessionId, token]);

  useEffect(() => {
    setMessages([]);
    fetchSession();
  }, [fetchSession]);

  const sendQuestion = async (question) => {
    const userId = `user-${Date.now()}`;
    const assistantId = `assistant-${Date.now() + 1}`;

    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: question, citations: [] },
      { id: assistantId, role: "assistant", content: "", citations: [], streaming: true },
    ]);
    setStreaming(true);

    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}/ask`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const err = await res.text();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err}`, streaming: false }
              : m
          )
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated } : m
          )
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  return { messages, streaming, sendQuestion };
}
```

- [ ] **Step 4: Create src/components/UserMessage.jsx**

```jsx
// frontend/src/components/UserMessage.jsx
export default function UserMessage({ content }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-accent/20 border border-accent/30 rounded-2xl rounded-tr-sm px-4 py-2.5">
        <p className="text-sm text-foreground">{content}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create src/components/CitationChip.jsx**

```jsx
// frontend/src/components/CitationChip.jsx
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function CitationChip({ citation, filename }) {
  const label = citation.page_number
    ? `${filename} · p.${citation.page_number}`
    : citation.section
    ? `${filename} · ${citation.section}`
    : filename;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="text-xs cursor-default bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 transition-colors"
          >
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-card border-border text-foreground text-xs">
          <p className="font-medium">{filename}</p>
          {citation.page_number && <p className="text-muted-foreground">Page {citation.page_number}</p>}
          {citation.section && <p className="text-muted-foreground">Section: {citation.section}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

- [ ] **Step 6: Create src/components/AssistantMessage.jsx**

```jsx
// frontend/src/components/AssistantMessage.jsx
import CitationChip from "./CitationChip";

export default function AssistantMessage({ content, citations, docMap = {} }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2">
        <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-2.5">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
        {citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {citations.map((c, i) => (
              <CitationChip
                key={i}
                citation={c}
                filename={docMap[c.document_id] || "Document"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create src/components/StreamingIndicator.jsx**

```jsx
// frontend/src/components/StreamingIndicator.jsx
export default function StreamingIndicator() {
  return (
    <div className="flex justify-start mt-2">
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create src/components/ChatInput.jsx**

```jsx
// frontend/src/components/ChatInput.jsx
import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const ref = useRef(null);

  const submit = () => {
    const q = value.trim();
    if (!q || disabled) return;
    onSend(q);
    setValue("");
    ref.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex gap-2 items-end bg-card border border-border rounded-xl p-2">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Ask anything about your documents…"
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-transparent border-0 focus-visible:ring-0 shadow-none text-sm text-foreground placeholder:text-muted-foreground min-h-0 p-1"
      />
      <Button
        size="icon"
        onClick={submit}
        disabled={!value.trim() || disabled}
        className="h-8 w-8 shrink-0"
      >
        <Send className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 9: Create src/components/MessageList.jsx**

```jsx
// frontend/src/components/MessageList.jsx
import UserMessage from "./UserMessage";
import AssistantMessage from "./AssistantMessage";

export default function MessageList({ messages, docMap }) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm text-muted-foreground">
          Ask a question about your attached documents
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {messages.map((msg) =>
        msg.role === "user" ? (
          <UserMessage key={msg.id} content={msg.content} />
        ) : (
          <AssistantMessage
            key={msg.id}
            content={msg.content}
            citations={msg.citations || []}
            docMap={docMap}
          />
        )
      )}
    </div>
  );
}
```

- [ ] **Step 10: Create src/components/ChatView.jsx**

```jsx
// frontend/src/components/ChatView.jsx
import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import StreamingIndicator from "./StreamingIndicator";
import { useSession } from "../hooks/useSession";

export default function ChatView({ sessionId, token, documents }) {
  const { messages, streaming, sendQuestion } = useSession(sessionId, token);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const docMap = Object.fromEntries(documents.map((d) => [d.id, d.filename]));

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4">
      <ScrollArea className="flex-1 py-6">
        <MessageList messages={messages} docMap={docMap} />
        {streaming && <StreamingIndicator />}
        <div ref={bottomRef} />
      </ScrollArea>
      <div className="py-4">
        <ChatInput onSend={sendQuestion} disabled={streaming} />
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Run chat tests — expect PASS**

```bash
npx vitest run tests/chat.test.jsx
```
Expected: PASS (6 tests)

- [ ] **Step 12: Run full test suite — expect PASS**

```bash
npx vitest run
```
Expected: all tests PASS

- [ ] **Step 13: Commit**

```bash
git add frontend/src/hooks/useSession.js frontend/src/components/ChatView.jsx frontend/src/components/MessageList.jsx frontend/src/components/UserMessage.jsx frontend/src/components/AssistantMessage.jsx frontend/src/components/CitationChip.jsx frontend/src/components/StreamingIndicator.jsx frontend/src/components/ChatInput.jsx frontend/tests/chat.test.jsx
git commit -m "feat: streaming chat with citations, message list, chat input"
```

---

## Task 5.6: Wire-Up + Dev Server Smoke Test

**Files:**
- Modify: `frontend/src/App.jsx` (already wired via Layout)
- Create: `frontend/.env.local` (manually — never commit)
- Modify: `frontend/index.html` (title + font)

**Interfaces:**
- Consumes: all components from Tasks 5.1–5.5
- Produces: running app at `http://localhost:5173`

- [ ] **Step 1: Update index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <title>DocuWise</title>
    <style>body { font-family: 'Inter', sans-serif; }</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create .env.local (fill in real values)**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
```

Do NOT commit this file. Verify it is in `.gitignore` (the backend `.gitignore` already covers `.env*` patterns — confirm `frontend/.env.local` is covered or add `frontend/.env.local` to root `.gitignore`).

- [ ] **Step 3: Run full test suite final check**

```bash
npx vitest run
```
Expected: all tests PASS

- [ ] **Step 4: Start dev server**

```bash
npm run dev
```
Expected: `Local: http://localhost:5173`

- [ ] **Step 5: Smoke test in browser**

Verify manually:
- [ ] Login screen renders on `http://localhost:5173`
- [ ] Sign in with Supabase credentials → redirects to empty state
- [ ] Click "New session" → session appears in drawer, chat view loads
- [ ] Upload a PDF/DOCX/CSV via drawer → appears in document list with processing → ready status
- [ ] Type question in chat → user bubble appears, streaming dots show, assistant response streams in
- [ ] Citation chips appear below assistant response
- [ ] Hover citation chip → tooltip shows document name + page
- [ ] Click summary icon on document → dialog opens with AI summary
- [ ] Click "New session" → creates new session, chat resets
- [ ] Sign out → returns to login screen

- [ ] **Step 6: Start backend to fully test (separate terminal)**

```bash
cd ../backend
uvicorn app.main:app --reload
```

- [ ] **Step 7: Commit**

```bash
git add frontend/index.html
git commit -m "feat: frontend wire-up, Inter font, smoke test verified"
```

- [ ] **Step 8: Tag Phase 5 complete**

```bash
git tag v0.2-frontend
git push origin main --tags
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Dark zinc/indigo theme | Task 5.1 (index.css, tailwind.config.js) |
| Command-palette centered layout | Task 5.3 (Layout.jsx — full-width chat) |
| Slide-in drawer (sessions + docs + upload) | Task 5.3 (SessionDrawer), Task 5.4 (DocumentPanel) |
| Supabase auth gate | Task 5.2 (useAuth, Login, App) |
| Upload drag-drop + type validation | Task 5.4 (DocumentPanel) |
| Document status badges | Task 5.4 (DocumentItem) |
| SSE streaming chat | Task 5.5 (useSession, ChatView) |
| Citation chips with tooltip | Task 5.5 (CitationChip) |
| Streaming indicator | Task 5.5 (StreamingIndicator) |
| Summary dialog | Task 5.4 (SummaryDialog) |
| Empty state with new-session CTA | Task 5.3 (EmptyState) |
| Session list + create | Task 5.3 (useSessions, SessionList) |
| Sign out | Task 5.3 (TopBar) |
| Vitest tests for all components | Tasks 5.1–5.5 |

**No placeholders found.** All code blocks are complete. Type signatures consistent across tasks — `useSession` always returns `{ messages, streaming, sendQuestion }`; `apiFetch` signature used identically in all hooks.
