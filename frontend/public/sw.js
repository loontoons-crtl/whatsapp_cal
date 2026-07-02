// Service worker: makes the app installable and handles the Web Share Target.
// When the user shares an invite (text/image/PDF) into the installed app, Android
// POSTs it to /share-target. We stash it, then redirect to /share (React route)
// which reads it back and sends it to /api/share.

const SHARE_CACHE = 'shared-invite';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith((async () => {
      try {
        const form = await event.request.formData();
        const file = form.get('file');
        const text = (form.get('text') || form.get('title') || form.get('url') || '').toString();
        const cache = await caches.open(SHARE_CACHE);
        if (file && file.size) {
          await cache.put('file', new Response(file, {
            headers: { 'X-Filename': file.name || 'shared', 'Content-Type': file.type || 'application/octet-stream' },
          }));
        } else {
          await cache.delete('file');
        }
        await cache.put('text', new Response(text));
      } catch (_) { /* fall through to the page, which will show an error */ }
      return Response.redirect('/share', 303);
    })());
  }
});
