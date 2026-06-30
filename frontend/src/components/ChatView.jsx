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
