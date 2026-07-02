import { useState } from 'react';
import { api, postJSON, patchJSON } from '../api.js';

// value for <input type="datetime-local"> (local time, no Z)
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function InviteCard({ invite, onChanged }) {
  // Editable fields live in local state so background polling never wipes typing.
  const [title, setTitle] = useState(invite.title || '');
  const [start, setStart] = useState(toLocalInput(invite.start));
  const [locationText, setLocationText] = useState(invite.location?.value || '');
  const [host, setHost] = useState(invite.host || '');
  const [notes, setNotes] = useState(invite.notes || '');
  const [busy, setBusy] = useState(false);

  if (invite.status === 'created') {
    const how = invite.autoCreated ? ' automatically' : '';
    return (
      <div className="card">
        <div className="meta">{invite.title || 'Event'} · {invite.chatName || ''}</div>
        <div className="flag ok created">
          ✅ Created{how} — <a href={invite.event?.htmlLink} target="_blank" rel="noreferrer">open in Google Calendar</a>
        </div>
      </div>
    );
  }

  const edits = () => ({
    title,
    host,
    notes,
    locationText,
    start: start ? new Date(start).toISOString() : null,
  });

  const withBusy = async (fn) => {
    setBusy(true);
    try { await fn(); onChanged?.(); }
    catch (err) { alert(err.message); }
    finally { setBusy(false); }
  };

  const save = () => withBusy(() => patchJSON(`/api/invites/${invite.id}`, edits()));
  const confirm = () => withBusy(async () => {
    await patchJSON(`/api/invites/${invite.id}`, edits());
    await postJSON(`/api/invites/${invite.id}/confirm`);
  });
  const dismiss = () => withBusy(() => api(`/api/invites/${invite.id}/dismiss`, { method: 'POST' }));

  const clar = invite.clarifications || [];
  const flag = clar.length
    ? <div className="flag warn">Needs your input: {clar.join(', ')}. Fill these in, then confirm.</div>
    : <div className="flag ok">Ready — review and confirm to create.</div>;

  const locStatus = invite.location?.status || 'missing';
  const locHint = !invite.location?.needsUserInput
    ? (locStatus === 'concrete' ? null
      : <div className="muted">No location detected — optional, leave blank or add one.</div>)
    : <div className="muted">⚠ Location looks {locStatus} (e.g. "{invite.location?.raw || '—'}"). Paste a full address or Google Maps link.</div>;

  const from = invite.source === 'whatsapp' ? `WhatsApp · ${invite.chatName}`
    : invite.source === 'share' ? `Shared ${invite.shared || ''}`
    : 'manual paste';
  const signals = (invite.detection?.signals || []).join('; ') || 'manual';

  return (
    <div className="card">
      <div className="meta">From {from} · detected signals: {signals}</div>
      {flag}
      <div className="field"><label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="field"><label>When</label>
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></div>
      <div className="field"><label>Location</label>
        <input value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="address or maps link" /></div>
      <div className="field"><label></label>{locHint}</div>
      <div className="field"><label>Host</label>
        <input value={host} onChange={(e) => setHost(e.target.value)} /></div>
      <div className="field"><label>Notes</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <details><summary>Original message</summary><pre>{invite.rawText || ''}</pre></details>
      <div className="actions">
        <button className="btn ghost" onClick={save} disabled={busy}>Save edits</button>
        <button className="btn primary" onClick={confirm} disabled={busy}>Confirm &amp; create</button>
        <button className="btn" onClick={dismiss} disabled={busy}>Dismiss</button>
      </div>
    </div>
  );
}
