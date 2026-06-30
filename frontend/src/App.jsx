// frontend/src/App.jsx
import { lazy, Suspense, useState } from "react";
import { useAuth } from "./auth/useAuth";
import Login from "./auth/Login";
import Landing from "./pages/Landing";

// Lazy so Layout is never loaded during tests (session is always null when mocked).
const Layout = lazy(() => import("./components/Layout"));

export default function App() {
  const { session, loading, signIn, signUp, signOut } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!session) {
    if (showLogin) return <Login onSignIn={signIn} onSignUp={signUp} />;
    return <Landing onShowLogin={() => setShowLogin(true)} />;
  }

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
