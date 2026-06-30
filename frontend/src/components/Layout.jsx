import { useState } from "react";
import { LogOut, Plus, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import EmptyState from "./EmptyState";
import ChatView from "./ChatView";
import { useSessions } from "../hooks/useSessions";
import { useDocuments } from "../hooks/useDocuments";
import { apiFetch } from "../api/client";

export default function Layout({ token, currentSessionId, onSessionSelect, onSignOut }) {
  const { sessions, createSession } = useSessions(token);
  const { documents, uploading, uploadFile } = useDocuments(token);
  const [creating, setCreating] = useState(false);
  const [sessionError, setSessionError] = useState("");

  const uploadAndAttach = async (file) => {
    const docId = await uploadFile(file);
    if (docId && currentSessionId) {
      await apiFetch(
        `/sessions/${currentSessionId}/documents`,
        { method: "POST", body: JSON.stringify({ document_ids: [docId] }) },
        token
      );
    }
  };

  const handleNewSession = async () => {
    setCreating(true);
    setSessionError("");
    try {
      const s = await createSession("New session");
      onSessionSelect(s.id);
    } catch (err) {
      setSessionError(err.message || "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Permanent left sidebar */}
      <aside className="w-64 shrink-0 border-r border-border bg-card flex flex-col">
        {/* Brand */}
        <div className="h-11 flex items-center px-4 border-b border-border shrink-0">
          <span className="text-sm font-semibold text-foreground">DocuWise</span>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <Button
            onClick={handleNewSession}
            disabled={creating}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 mb-1 text-muted-foreground hover:text-foreground"
          >
            {creating
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Plus className="h-3.5 w-3.5" />}
            {creating ? "Creating…" : "New session"}
          </Button>

          {sessionError && (
            <p className="text-xs text-destructive px-2 mb-2">{sessionError}</p>
          )}

          <p className="text-[10px] text-muted-foreground/60 px-2 py-1 uppercase tracking-wider">
            Sessions
          </p>
          <div className="space-y-0.5">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => onSessionSelect(s.id)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors",
                  s.id === currentSessionId
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{s.title}</span>
              </button>
            ))}
            {sessions.length === 0 && !creating && (
              <p className="text-xs text-muted-foreground px-2 py-2">No sessions yet</p>
            )}
          </div>
        </div>

        {/* Sign out */}
        <div className="p-2 border-t border-border shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-11 border-b border-border flex items-center px-4 shrink-0">
          <span className="text-xs font-medium text-foreground/70">
            {currentSession?.title || "DocuWise"}
          </span>
        </header>
        {currentSessionId ? (
          <ChatView
            sessionId={currentSessionId}
            token={token}
            allDocuments={documents}
            onUpload={uploadAndAttach}
            uploading={uploading}
          />
        ) : (
          <EmptyState onNewSession={handleNewSession} />
        )}
      </main>
    </div>
  );
}
