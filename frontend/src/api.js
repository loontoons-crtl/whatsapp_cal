// Base URL for the backend API.
//  - empty (default): same-origin — works in dev (Vite proxy) and when the
//    backend serves the built frontend.
//  - set VITE_API_URL (e.g. https://your-backend.onrender.com) when the frontend
//    is hosted separately (e.g. on Vercel) from the backend.
let _base = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
// If someone sets VITE_API_URL without a scheme (e.g. "foo.up.railway.app"), the
// browser would treat it as a relative path and hit the frontend's own origin.
// Prepend https:// so it points at the real backend.
if (_base && !/^https?:\/\//i.test(_base)) _base = 'https://' + _base;
const API_BASE = _base;

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
