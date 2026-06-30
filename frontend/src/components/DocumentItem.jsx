// frontend/src/components/DocumentItem.jsx
import { useState } from "react";
import { FileText, CheckCircle, AlertCircle, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import SummaryDialog from "./SummaryDialog";

const STATUS_ICON = {
  ready: <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />,
  processing: <Loader2 className="h-3 w-3 text-muted-foreground animate-spin shrink-0" />,
  error: <AlertCircle className="h-3 w-3 text-destructive shrink-0" />,
};

export default function DocumentItem({ doc, onRequestSummary }) {
  const [summaryOpen, setSummaryOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted group">
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs text-foreground truncate flex-1">{doc.filename}</span>
        {STATUS_ICON[doc.status] || null}
        {doc.status === "ready" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setSummaryOpen(true)}
          >
            <BookOpen className="h-3 w-3" />
          </Button>
        )}
      </div>
      <SummaryDialog
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        docName={doc.filename}
        onFetchSummary={onRequestSummary}
      />
    </>
  );
}
