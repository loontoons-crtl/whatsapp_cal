// Base URL for the backend API.
//  - empty (default): same-origin — works in dev (Vite proxy) and when the
//    backend serves the built frontend.
//  - set VITE_API_URL (e.g. https://your-backend.onrender.com) when the frontend
//    is hosted separately (e.g. on Vercel) from the backend.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Thin fetch wrapper. Relative URLs work in prod (backend serves the app) and in
// dev (Vite proxies /api and /share-target to the backend).
export async function api(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const getJSON = (path) => api(path);
export const postJSON = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
export const patchJSON = (path, body) => api(path, { method: 'PATCH', body: JSON.stringify(body || {}) });
