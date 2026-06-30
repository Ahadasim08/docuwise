import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api/client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useSession(sessionId, token) {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!sessionId || !token) return;
    const res = await apiFetch(`/sessions/${sessionId}`, {}, token);
    const data = await res.json();
    setMessages(
      (data.messages || []).map((m) => ({
        ...m,
        citations: m.citations || [],
      }))
    );
  }, [sessionId, token]);

  useEffect(() => {
    setMessages([]);
    fetchSession().catch(console.error);
  }, [fetchSession]);

  const sendQuestion = async (question) => {
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: question, citations: [] },
      { id: assistantId, role: "assistant", content: "", citations: [], streaming: true },
    ]);
    setStreaming(true);

    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}/ask`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const err = await res.text();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err}`, streaming: false }
              : m
          )
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated } : m
          )
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  return { messages, streaming, sendQuestion };
}
