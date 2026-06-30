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
