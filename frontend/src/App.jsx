// frontend/src/App.jsx
import { lazy, Suspense, useState } from "react";
import { useAuth } from "./auth/useAuth";
import Login from "./auth/Login";

// Lazy so Layout is never loaded during tests (session is always null when mocked).
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <Layout
        token={session.access_token}
        currentSessionId={currentSessionId}
        onSessionSelect={setCurrentSessionId}
        onSignOut={signOut}
      />
    </Suspense>
  );
}
