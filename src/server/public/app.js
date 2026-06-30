const $ = (sel) => document.querySelector(sel);

async function api(path, opts) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

// ---- format helpers ----
function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
// value for <input type="datetime-local"> (local time, no Z)
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---- status ----
async function refreshStatus() {
  try {
    const s = await api('/api/status');
    const g = $('#google-state');
    g.textContent = s.googleConnected ? 'connected' : 'not connected';
    g.className = 'badge ' + (s.googleConnected ? 'ok' : 'bad');
    $('#connect-google').classList.toggle('hidden', s.googleConnected);

    const wa = $('#wa-state');
    if (s.whatsappMode === 'manual') {
      wa.textContent = 'manual mode';
      wa.className = 'badge';
    } else {
      wa.textContent = s.whatsappReady ? 'connected' : 'waiting for QR scan';
      wa.className = 'badge ' + (s.whatsappReady ? 'ok' : 'bad');
    }

    // The group-fetch panel only makes sense in live mode once WhatsApp is linked.
    const groupPanel = $('#group-fetch');
    if (groupPanel) {
      groupPanel.classList.toggle('hidden', s.whatsappMode === 'manual');
      $('#group-fetch-btn').disabled = !s.whatsappReady;
      $('#group-list-btn').disabled = !s.whatsappReady;
    }

    const qrWrap = $('#qr-wrap');
    if (s.qr && !s.whatsappReady) {
      $('#qr').src = s.qr;
      qrWrap.classList.remove('hidden');
    } else {
      qrWrap.classList.add('hidden');
    }

    const auto = s.autoCreate ? ' · ⚡ auto-create ON' : '';
    $('#status').textContent = s.lastError ? `⚠ ${s.lastError}` : `reminders: 1 day & 4 hours before · ${s.timezone}${auto}`;
  } catch (e) {
    $('#status').textContent = '⚠ ' + e.message;
  }
}

// ---- invites ----
function flagFor(inv) {
  if (inv.status === 'created') {
    const how = inv.autoCreated ? ' automatically' : '';
    return `<div class="flag ok created">✅ Created${how} — <a href="${inv.event.htmlLink}" target="_blank">open in Google Calendar</a></div>`;
  }
  if (inv.clarifications && inv.clarifications.length) {
    return `<div class="flag warn">Needs your input: ${inv.clarifications.join(', ')}. Fill these in, then confirm.</div>`;
  }
  return `<div class="flag ok">Ready — review and confirm to create.</div>`;
}

function card(inv) {
  if (inv.status === 'created') {
    return `<div class="card" data-id="${inv.id}">
      <div class="meta">${inv.title || 'Event'} · ${inv.chatName || ''}</div>
      ${flagFor(inv)}
    </div>`;
  }
  const locStatus = inv.location?.status || 'missing';
  // Only nag when location is actually required (manual mode). Otherwise it's optional.
  const locHint = !inv.location?.needsUserInput
    ? (locStatus === 'concrete' ? '' : `<div class="muted">No location detected — optional, leave blank or add one.</div>`)
    : `<div class="muted">⚠ Location looks ${locStatus} (e.g. "${inv.location?.raw || '—'}"). Paste a full address or Google Maps link.</div>`;
  return `<div class="card" data-id="${inv.id}">
    <div class="meta">From ${inv.source === 'whatsapp' ? `WhatsApp · ${inv.chatName}` : 'manual paste'} · detected signals: ${(inv.detection?.signals || []).join('; ') || 'manual'}</div>
    ${flagFor(inv)}
    <div class="field"><label>Title</label><input data-f="title" value="${escapeAttr(inv.title)}" /></div>
    <div class="field"><label>When</label><input type="datetime-local" data-f="start" value="${toLocalInput(inv.start)}" /></div>
    <div class="field"><label>Location</label><input data-f="locationText" value="${escapeAttr(inv.location?.value || '')}" placeholder="address or maps link" /></div>
    <div class="field"><label></label>${locHint}</div>
    <div class="field"><label>Host</label><input data-f="host" value="${escapeAttr(inv.host || '')}" /></div>
    <div class="field"><label>Notes</label><input data-f="notes" value="${escapeAttr(inv.notes || '')}" /></div>
    <details><summary>Original message</summary><pre>${escapeHtml(inv.rawText || '')}</pre></details>
    <div class="actions">
      <button class="btn ghost" data-act="save">Save edits</button>
      <button class="btn primary" data-act="confirm">Confirm &amp; create</button>
      <button class="btn" data-act="dismiss">Dismiss</button>
    </div>
  </div>`;
}

function escapeHtml(s) { return (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

let lastSignature = null;

// Only the server-owned fields — typing in an input must NOT change this.
function listSignature(list) {
  return JSON.stringify(list.map((i) => [
    i.id, i.status, i.start, i.end, i.title, i.host, i.notes,
    i.location?.value, i.location?.status, i.location?.needsUserInput,
    (i.clarifications || []).join(','), i.event?.htmlLink,
  ]));
}

// Is the user currently typing in one of the invite fields?
function isEditingInvites() {
  const el = document.activeElement;
  return !!el && $('#invites').contains(el) && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

async function refreshInvites({ force = false } = {}) {
  const list = await api('/api/invites');
  $('#count').textContent = list.length ? `${list.length}` : '';
  const sig = listSignature(list);
  // Avoid wiping in-progress edits: re-render only when the server data
  // actually changed, and never while a field here is focused.
  if (!force) {
    if (sig === lastSignature) return;
    if (isEditingInvites()) return; // a later tick will pick up the change
  }
  lastSignature = sig;
  $('#invites').innerHTML = list.length ? list.map(card).join('') : '<p class="muted">No invites yet. Paste one above, or wait for WhatsApp.</p>';
}

function collectEdits(cardEl) {
  const out = {};
  cardEl.querySelectorAll('[data-f]').forEach((el) => {
    const f = el.getAttribute('data-f');
    if (f === 'start') {
      out.start = el.value ? new Date(el.value).toISOString() : null;
    } else {
      out[f] = el.value;
    }
  });
  return out;
}

// event delegation for card buttons
$('#invites').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const cardEl = btn.closest('.card');
  const id = cardEl.getAttribute('data-id');
  const act = btn.getAttribute('data-act');
  btn.disabled = true;
  try {
    if (act === 'save') {
      await api(`/api/invites/${id}`, { method: 'PATCH', body: JSON.stringify(collectEdits(cardEl)) });
      await refreshInvites({ force: true });
    } else if (act === 'confirm') {
      // save edits first so what you see is what gets created
      await api(`/api/invites/${id}`, { method: 'PATCH', body: JSON.stringify(collectEdits(cardEl)) });
      await api(`/api/invites/${id}/confirm`, { method: 'POST' });
      await refreshInvites({ force: true });
    } else if (act === 'dismiss') {
      await api(`/api/invites/${id}/dismiss`, { method: 'POST' });
      await refreshInvites({ force: true });
    }
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
  }
});

$('#manual-submit').addEventListener('click', async () => {
  const text = $('#manual-text').value.trim();
  if (!text) return;
  try {
    await api('/api/invites/manual', { method: 'POST', body: JSON.stringify({ text }) });
    $('#manual-text').value = '';
    await refreshInvites({ force: true });
  } catch (err) { alert(err.message); }
});

// ---- WhatsApp group fetch ----
const groupFetchBtn = $('#group-fetch-btn');
if (groupFetchBtn) {
  groupFetchBtn.addEventListener('click', async () => {
    const group = $('#group-name').value.trim();
    const limit = $('#group-limit').value;
    if (!group) { alert('Enter a group or chat name first.'); return; }
    groupFetchBtn.disabled = true;
    const prev = groupFetchBtn.textContent;
    groupFetchBtn.textContent = 'Fetching…';
    try {
      const r = await api('/api/whatsapp/fetch', { method: 'POST', body: JSON.stringify({ group, limit }) });
      await refreshInvites({ force: true });
      alert(`Scanned ${r.scanned} recent message(s) from "${r.group}". Added ${r.added} invite(s).`);
    } catch (err) {
      alert(err.message);
    } finally {
      groupFetchBtn.textContent = prev;
      groupFetchBtn.disabled = false;
    }
  });

  $('#group-list-btn').addEventListener('click', async () => {
    const box = $('#group-list');
    box.textContent = 'Loading…';
    try {
      const chats = await api('/api/chats');
      const groups = chats.filter((c) => c.name);
      if (!groups.length) { box.textContent = 'No chats synced yet. Open WhatsApp on your phone.'; return; }
      box.innerHTML = groups.map((c) =>
        `<button class="chip" data-name="${escapeAttr(c.name)}">${c.isGroup ? '👥 ' : ''}${escapeHtml(c.name)}</button>`
      ).join('');
    } catch (err) {
      box.textContent = err.message;
    }
  });

  // click a chip to fill the group name
  $('#group-list').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    $('#group-name').value = chip.getAttribute('data-name');
  });
}

$('#connect-google').addEventListener('click', async () => {
  try {
    await api('/api/google/connect', { method: 'POST' });
    alert('Consent screen opened in your browser. Approve, then this page will update.');
  } catch (err) { alert(err.message); }
});

// register the service worker (enables install + share target)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// poll
refreshStatus();
refreshInvites();
setInterval(refreshStatus, 3000);
setInterval(refreshInvites, 4000);
