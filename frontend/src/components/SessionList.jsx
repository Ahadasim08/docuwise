// frontend/src/components/SessionList.jsx
import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SessionList({ sessions, currentId, onSelect, onNew }) {
  return (
    <div className="px-2 py-2">
      <Button onClick={onNew} variant="ghost" size="sm" className="w-full justify-start gap-2 mb-2">
        <Plus className="h-3.5 w-3.5" />
        New session
      </Button>
      <p className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wider">Sessions</p>
      <div className="space-y-0.5">
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              "w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors",
              s.id === currentId
                ? "bg-accent/20 text-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{s.title}</span>
          </button>
        ))}
        {sessions.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-2">No sessions yet</p>
        )}
      </div>
    </div>
  );
}
