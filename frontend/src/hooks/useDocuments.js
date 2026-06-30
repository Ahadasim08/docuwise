// frontend/src/hooks/useDocuments.js
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api/client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function pollUntilReady(docId, token, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`${API_URL}/documents/${docId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Status check failed");
    const doc = await res.json();
    if (doc.status === "ready") return;
    if (doc.status === "error") throw new Error(doc.error_message || "Processing failed");
  }
  throw new Error("Document processing timed out after 2 minutes");
}

export function useDocuments(token) {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    const res = await apiFetch("/documents", {}, token);
    setDocuments(await res.json());
  }, [token]);

  useEffect(() => { fetchDocuments().catch(console.error); }, [fetchDocuments]);

  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.status === "processing") {
        await pollUntilReady(data.document_id, token);
      }
      await fetchDocuments();
      return data.document_id;
    } finally {
      setUploading(false);
    }
  };

  const requestSummary = async (docId) => {
    const res = await apiFetch(`/documents/${docId}/summary`, { method: "POST" }, token);
    const data = await res.json();
    return data.summary;
  };

  return { documents, uploading, uploadFile, requestSummary };
}
