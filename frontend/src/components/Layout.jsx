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
