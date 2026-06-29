const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function buildHeaders(token, base = {}) {
  return { ...base, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function apiFetch(path, opts = {}, token = null) {
  const headers = token
    ? buildHeaders(token, opts.headers || {})
    : opts.headers || {};
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  if (!res.ok) throw new Error(await res.text());
  return res;
}
