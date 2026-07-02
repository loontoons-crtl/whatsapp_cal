import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const SHARE_CACHE = 'shared-invite';

// Landing page after a Web Share. Reads the content the service worker stashed,
// sends it to /api/share, and shows whether the event was created.
export default function Share() {
  const [msg, setMsg] = useState('Reading what you shared…');
  const [link, setLink] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const cache = await caches.open(SHARE_CACHE);
        const fileRes = await cache.match('file');
        const textRes = await cache.match('text');
        const text = textRes ? await textRes.text() : '';

        const fd = new FormData();
        if (fileRes) {
          const blob = await fileRes.blob();
          const name = fileRes.headers.get('X-Filename') || 'shared';
          fd.append('file', blob, name);
        }
        if (text) fd.append('text', text);

        await cache.delete('file');
        await cache.delete('text');

        if (!fileRes && !text) { setMsg('Nothing was shared.'); return; }

        setMsg('Reading the invite…');
        const res = await fetch('/api/share', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setMsg('⚠ ' + (data.error || res.statusText)); return; }

        setLink(data.calendarLink || null);
        if (!data.detected) setMsg("That didn't look like an invite.");
        else if (data.created) setMsg('✅ Event created on your calendar!');
        else setMsg('Invite read — tap below to add it (a couple of details may need a quick check).');
      } catch (e) {
        setMsg('⚠ ' + e.message);
      }
    })();
  }, []);

  return (
    <main>
      <section className="panel" style={{ textAlign: 'center' }}>
        <h2>Adding your invite</h2>
        <div className="muted">{msg}</div>
        {link && (
          <div style={{ marginTop: 14 }}>
            <a className="btn primary" href={link} target="_blank" rel="noreferrer">Open in Google Calendar</a>
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <Link className="btn" to="/">← Back to dashboard</Link>
        </div>
      </section>
    </main>
  );
}
