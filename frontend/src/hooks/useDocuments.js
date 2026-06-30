// frontend/src/hooks/useDocuments.js
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api/client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
      await fetchDocuments();
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
