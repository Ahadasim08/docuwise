import { useState } from "react";
import { LogOut, Plus, MessageSquare, Loader2, FileSearch, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import EmptyState from "./EmptyState";
import ChatView from "./ChatView";
import { useSessions } from "../hooks/useSessions";
import { useDocuments } from "../hooks/useDocuments";
import { apiFetch } from "../api/client";

export default function Layout({ token, currentSessionId, onSessionSelect, onSignOut }) {
  const { sessions, createSession, renameSession, deleteSession } = useSessions(token);
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

  const handleRename = (title) => {
    if (!currentSessionId) return;
    renameSession(currentSessionId, title).catch(console.error);
  };

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
        {/* Brand */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <FileSearch className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-foreground">DocuWise</span>
            <span className="text-[10px] text-muted-foreground/70 tracking-wide">AI Document Q&A</span>
          </div>
        </div>

        {/* New session button */}
        <div className="px-2 pt-3 pb-1 shrink-0">
          <Button
            onClick={handleNewSession}
            disabled={creating}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            {creating
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Plus className="h-3.5 w-3.5" />}
            {creating ? "Creating…" : "New session"}
          </Button>
          {sessionError && (
            <p className="text-xs text-destructive px-2 mt-1">{sessionError}</p>
          )}
        </div>

        {/* Session list — scrollable middle */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
          <p className="text-[10px] text-muted-foreground/50 px-2 py-1 uppercase tracking-wider">
            Sessions
          </p>
          <div className="space-y-0.5">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "group w-full flex items-center gap-1 rounded-md transition-colors",
                  s.id === currentSessionId
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <button
                  onClick={() => onSessionSelect(s.id)}
                  className="flex-1 min-w-0 text-left px-2 py-1.5 text-sm flex items-center gap-2"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{s.title}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(s.id).then(() => {
                      if (s.id === currentSessionId) onSessionSelect(null);
                    }).catch(console.error);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 rounded hover:text-destructive transition-all shrink-0"
                  title="Delete session"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {sessions.length === 0 && !creating && (
              <p className="text-xs text-muted-foreground px-2 py-2">No sessions yet</p>
            )}
          </div>
        </div>

        {/* Sign out — always pinned at bottom */}
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

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-11 border-b border-border flex items-center px-4 shrink-0">
          <span className="text-xs font-medium text-foreground/70 truncate">
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
            onRename={handleRename}
          />
        ) : (
          <EmptyState onNewSession={handleNewSession} />
        )}
      </main>
    </div>
  );
}
