// frontend/src/components/EmptyState.jsx
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmptyState({ onNewSession }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
      <MessageSquare className="h-10 w-10 text-muted-foreground" />
      <div>
        <p className="text-foreground font-medium">No session selected</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start a new session to ask questions about your documents
        </p>
      </div>
      <Button onClick={onNewSession}>New session</Button>
    </div>
  );
}
