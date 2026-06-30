// frontend/src/hooks/useSessions.js
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api/client";

export function useSessions(token) {
  const [sessions, setSessions] = useState([]);

  const fetchSessions = useCallback(async () => {
    if (!token) return;
    const res = await apiFetch("/sessions", {}, token);
    if (!res.ok) throw new Error(await res.text());
    setSessions(await res.json());
  }, [token]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const createSession = useCallback(async (title = "New session") => {
    const res = await apiFetch("/sessions", {
      method: "POST",
      body: JSON.stringify({ title }),
    }, token);
    if (!res.ok) throw new Error(await res.text());
    const session = await res.json();
    await fetchSessions();
    return session;
  }, [token, fetchSessions]);

  return { sessions, createSession };
}
