// Thin fetch wrapper. Relative URLs work in prod (backend serves the app) and in
// dev (Vite proxies /api and /share-target to the backend).
export async function api(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(path, {
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
