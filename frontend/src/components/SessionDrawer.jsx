// frontend/src/components/SessionDrawer.jsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import SessionList from "./SessionList";
import DocumentPanel from "./DocumentPanel";

export default function SessionDrawer({
  open, onClose, sessions, currentSessionId, onSessionSelect, onNewSession,
  documents, uploading, onUpload, onRequestSummary, token,
}) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 bg-card border-border p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <SheetTitle className="text-foreground text-sm font-semibold">DocuWise</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <SessionList
            sessions={sessions}
            currentId={currentSessionId}
            onSelect={onSessionSelect}
            onNew={onNewSession}
          />
          <Separator />
          <DocumentPanel
            documents={documents}
            uploading={uploading}
            onUpload={onUpload}
            onRequestSummary={onRequestSummary}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
