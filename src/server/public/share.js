// Runs on /share.html after a share. Reads the stashed content from the SW cache,
// sends it to /api/share, and shows whether the event was created.
const SHARE_CACHE = 'shared-invite';

function show(html) { document.getElementById('share-result').innerHTML = html; }
function status(text) { document.getElementById('share-status').textContent = text; }

async function run() {
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

    // clean up the stash so a refresh doesn't re-add
    await cache.delete('file');
    await cache.delete('text');

    if (!fileRes && !text) { status('Nothing was shared.'); return; }

    status('Reading the invite…');
    const res = await fetch('/api/share', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { status('⚠ ' + (data.error || res.statusText)); return; }

    if (!data.detected) {
      status("That didn't look like an invite.");
      show(`<a class="btn primary" href="${data.calendarLink}" target="_blank">Add to calendar anyway</a>`);
      return;
    }
    if (data.created) {
      status('✅ Event created on your calendar!');
      show(`<a class="btn primary" href="${data.calendarLink}" target="_blank">Open in Google Calendar</a>`);
    } else {
      status('Invite read — tap to add it (a couple of details may need a quick check).');
      show(`<a class="btn primary" href="${data.calendarLink}" target="_blank">Add to calendar</a>
            <p class="muted" style="margin-top:8px">Or finish it on the <a href="/">dashboard</a>.</p>`);
    }
  } catch (e) {
    status('⚠ ' + e.message);
  }
}
run();
