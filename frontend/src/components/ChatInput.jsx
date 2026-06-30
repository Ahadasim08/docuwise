import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const ref = useRef(null);

  const submit = () => {
    const q = value.trim();
    if (!q || disabled) return;
    onSend(q);
    setValue("");
    ref.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex gap-2 items-end bg-card border border-border rounded-xl p-2">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Ask anything about your documents…"
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-transparent border-0 focus-visible:ring-0 shadow-none text-sm text-foreground placeholder:text-muted-foreground min-h-0 p-1"
      />
      <Button
        size="icon"
        onClick={submit}
        disabled={!value.trim() || disabled}
        className="h-8 w-8 shrink-0"
      >
        <Send className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
