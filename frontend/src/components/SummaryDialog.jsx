// frontend/src/components/SummaryDialog.jsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SummaryDialog({ open, onClose, docName, onFetchSummary }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSummary("");
    setError("");
    onFetchSummary()
      .then((s) => setSummary(s))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground text-sm font-medium">
            {docName} — Summary
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-96 mt-2">
          {loading && <p className="text-sm text-muted-foreground">Generating summary…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {summary && (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{summary}</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
