import { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import StreamingIndicator from "./StreamingIndicator";
import { useSession } from "../hooks/useSession";
import { cn } from "@/lib/utils";

export default function ChatView({ sessionId, token, allDocuments = [], onUpload, uploading, onRename }) {
  const { messages, streaming, sendQuestion, sessionDocumentIds, refreshSession } = useSession(sessionId, token);
  const bottomRef = useRef(null);
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  const sessionDocs = allDocuments.filter((d) => sessionDocumentIds.includes(d.id));
  const docMap = Object.fromEntries(sessionDocs.map((d) => [d.id, d.filename]));

  // Reset selection to all docs whenever attached docs change
  useEffect(() => {
    setSelectedDocIds(sessionDocs.map((d) => d.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionDocumentIds.join(",")]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleDoc = (docId) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleUpload = async (file) => {
    await onUpload(file);
    await refreshSession();
  };

  const handleSend = (question) => {
    // Auto-rename on first question if session still has default title
    if (messages.length === 0 && onRename) {
      const title = question.length > 48 ? question.slice(0, 45) + "…" : question;
      onRename(title);
    }
    const active = selectedDocIds.length > 0 ? selectedDocIds : sessionDocs.map((d) => d.id);
    sendQuestion(question, active.length > 0 ? active : null);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <ScrollArea className="flex-1 min-h-0">
        <div className="max-w-3xl mx-auto w-full px-4 py-6">
          <MessageList messages={messages} docMap={docMap} />
          {streaming && <StreamingIndicator />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="max-w-3xl mx-auto w-full px-4 py-4 space-y-2">
        {sessionDocs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {sessionDocs.map((d) => {
              const active = selectedDocIds.includes(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDoc(d.id)}
                  title={active ? "Click to exclude from search" : "Click to include in search"}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] font-medium rounded-md px-2.5 py-1 border transition-all",
                    active
                      ? "text-primary bg-primary/10 border-primary/30 hover:bg-primary/20"
                      : "text-muted-foreground bg-muted/40 border-border/50 hover:bg-muted line-through decoration-muted-foreground/40"
                  )}
                >
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    active ? "bg-primary/70" : "bg-muted-foreground/40"
                  )} />
                  {d.filename}
                </button>
              );
            })}
            {sessionDocs.length > 1 && (
              <button
                onClick={() => {
                  const allSelected = selectedDocIds.length === sessionDocs.length;
                  setSelectedDocIds(allSelected ? [] : sessionDocs.map((d) => d.id));
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-1 transition-colors"
              >
                {selectedDocIds.length === sessionDocs.length ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>
        )}
        <ChatInput onSend={handleSend} disabled={streaming} onUpload={handleUpload} uploading={uploading} />
      </div>
    </div>

  );
}
