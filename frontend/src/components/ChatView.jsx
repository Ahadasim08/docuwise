import { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, FileSpreadsheet, File } from "lucide-react";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import StreamingIndicator from "./StreamingIndicator";
import { useSession } from "../hooks/useSession";
import { cn } from "@/lib/utils";

function DocIcon({ ext }) {
  if (ext === "pdf") return <FileText className="h-3.5 w-3.5 shrink-0" />;
  if (ext === "csv") return <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />;
  return <File className="h-3.5 w-3.5 shrink-0" />;
}

function shortName(filename) {
  const max = 22;
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : "";
  if (base.length <= max) return filename;
  return base.slice(0, max) + "…" + ext;
}

export default function ChatView({ sessionId, token, allDocuments = [], onUpload, uploading, onRename }) {
  const { messages, streaming, sendQuestion, sessionDocumentIds, refreshSession } = useSession(sessionId, token);
  const bottomRef = useRef(null);
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  const sessionDocs = allDocuments.filter((d) => sessionDocumentIds.includes(d.id));
  const docMap = Object.fromEntries(sessionDocs.map((d) => [d.id, d.filename]));

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
    if (messages.length === 0 && onRename) {
      const title = question.length > 48 ? question.slice(0, 45) + "…" : question;
      onRename(title);
    }
    const active = selectedDocIds.length > 0 ? selectedDocIds : sessionDocs.map((d) => d.id);
    sendQuestion(question, active.length > 0 ? active : null);
  };

  const allSelected = selectedDocIds.length === sessionDocs.length;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <ScrollArea className="flex-1 min-h-0">
        <div className="max-w-3xl mx-auto w-full px-4 py-6">
          <MessageList messages={messages} docMap={docMap} />
          {streaming && <StreamingIndicator />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="max-w-3xl mx-auto w-full px-4 py-4 space-y-3">
        {sessionDocs.length > 0 && (
          <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40">
              <span className="text-xs font-medium text-muted-foreground/60">
                {selectedDocIds.length}/{sessionDocs.length} sources active
              </span>
              {sessionDocs.length > 1 && (
                <button
                  onClick={() => setSelectedDocIds(allSelected ? [] : sessionDocs.map((d) => d.id))}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-px bg-border/30">
              {sessionDocs.map((d) => {
                const active = selectedDocIds.includes(d.id);
                const ext = d.filename.split(".").pop()?.toLowerCase() ?? "";
                return (
                  <button
                    key={d.id}
                    onClick={() => toggleDoc(d.id)}
                    title={d.filename}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-left transition-colors",
                      active
                        ? "bg-card text-foreground hover:bg-primary/5"
                        : "bg-muted/40 text-muted-foreground/50 hover:bg-muted/60"
                    )}
                  >
                    <span className={cn("shrink-0", active ? "text-primary" : "text-muted-foreground/30")}>
                      <DocIcon ext={ext} />
                    </span>
                    <span className="text-[11px] font-medium truncate">
                      {shortName(d.filename)}
                    </span>
                    <span className={cn(
                      "ml-auto h-1.5 w-1.5 rounded-full shrink-0",
                      active ? "bg-primary" : "bg-muted-foreground/20"
                    )} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <ChatInput onSend={handleSend} disabled={streaming} onUpload={handleUpload} uploading={uploading} />
      </div>
    </div>
  );
}
