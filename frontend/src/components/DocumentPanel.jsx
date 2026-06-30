// frontend/src/components/DocumentPanel.jsx
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import DocumentItem from "./DocumentItem";

const ALLOWED = ["pdf", "docx", "csv"];

export default function DocumentPanel({ documents, uploading, onUpload, onRequestSummary }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const validate = (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!ALLOWED.includes(ext)) {
      setError(`${ext} not supported. Use PDF, DOCX, or CSV.`);
      return false;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File exceeds 20 MB limit.");
      return false;
    }
    setError("");
    return true;
  };

  const handleFiles = async (files) => {
    const file = files[0];
    if (!file || !validate(file)) return;
    try {
      await onUpload(file);
    } catch (e) {
      setError(e.message || "Upload failed.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="px-2 py-2">
      <p className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wider">Documents</p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "mx-2 my-2 border border-dashed rounded-md p-3 text-center cursor-pointer transition-colors",
          dragOver ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
        )}
      >
        <Upload className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">
          {uploading ? "Uploading…" : "Drop file or click to upload"}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">PDF · DOCX · CSV · max 20 MB</p>
        <input
          ref={inputRef}
          data-testid="file-input"
          type="file"
          className="hidden"
          accept=".pdf,.docx,.csv"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="text-xs text-destructive px-2 mb-2">{error}</p>}
      <div className="space-y-0.5">
        {documents.map((doc) => (
          <DocumentItem
            key={doc.id}
            doc={doc}
            onRequestSummary={() => onRequestSummary(doc.id)}
          />
        ))}
      </div>
    </div>
  );
}
