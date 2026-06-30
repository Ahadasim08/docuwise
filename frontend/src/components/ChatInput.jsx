import { useState, useRef } from "react";
import { ArrowUp, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatInput({ onSend, disabled, onUpload, uploading }) {
  const [value, setValue] = useState("");
  const textRef = useRef(null);
  const fileRef = useRef(null);

  const submit = () => {
    const q = value.trim();
    if (!q || disabled) return;
    onSend(q);
    setValue("");
    textRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      try {
        await onUpload(file);
      } catch (err) {
        console.error("Upload failed:", err);
        alert(`Upload failed: ${err.message}`);
      }
    }
    e.target.value = "";
  };

  return (
    <div className="flex gap-2 items-end border border-border bg-card rounded-lg px-3 py-2.5 transition-colors focus-within:border-primary/40">
      {onUpload && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 mb-0.5"
            title="Upload document"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.csv"
            className="hidden"
            onChange={handleFile}
          />
        </>
      )}
      <Textarea
        ref={textRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder={uploading ? "Uploading…" : "Ask anything about your documents…"}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-transparent border-0 outline-none focus-visible:ring-0 focus:outline-none shadow-none text-sm text-foreground placeholder:text-muted-foreground/60 min-h-0 p-0"
        style={{ outline: "none", boxShadow: "none" }}
      />
      <Button
        size="icon"
        onClick={submit}
        disabled={!value.trim() || disabled}
        className="h-7 w-7 shrink-0 rounded-md mb-0.5"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
