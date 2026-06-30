import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import StreamingIndicator from "./StreamingIndicator";
import { useSession } from "../hooks/useSession";

export default function ChatView({ sessionId, token, allDocuments = [], onUpload, uploading }) {
  const { messages, streaming, sendQuestion, sessionDocumentIds, refreshSession } = useSession(sessionId, token);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Only show docs actually attached to this session
  const sessionDocs = allDocuments.filter((d) => sessionDocumentIds.includes(d.id));
  const docMap = Object.fromEntries(sessionDocs.map((d) => [d.id, d.filename]));

  const handleUpload = async (file) => {
    await onUpload(file);
    await refreshSession(); // pull updated document_ids after attach
  };

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4">
      <ScrollArea className="flex-1 py-6">
        <MessageList messages={messages} docMap={docMap} />
        {streaming && <StreamingIndicator />}
        <div ref={bottomRef} />
      </ScrollArea>
      <div className="py-4 space-y-2">
        {sessionDocs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {sessionDocs.map((d) => (
              <span key={d.id} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/10 border border-primary/25 rounded-md px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0" />
                {d.filename}
              </span>
            ))}
          </div>
        )}
        <ChatInput onSend={sendQuestion} disabled={streaming} onUpload={handleUpload} uploading={uploading} />
      </div>
    </div>
  );
}
