import { useState } from 'react';
import { api, postJSON } from '../api.js';

// Only shown in whatsapp-web mode. Lets you pull recent messages from a group
// and queue any invites found.
export default function GroupFetch({ status, onAdded }) {
  const [group, setGroup] = useState('');
  const [limit, setLimit] = useState(30);
  const [chats, setChats] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!status || status.whatsappMode === 'manual') return null;
  const ready = status.whatsappReady;

  const fetchInvites = async () => {
    if (!group.trim()) { alert('Enter a group or chat name first.'); return; }
    setBusy(true);
    try {
      const r = await postJSON('/api/whatsapp/fetch', { group: group.trim(), limit });
      onAdded?.();
      alert(`Scanned ${r.scanned} recent message(s) from "${r.group}". Added ${r.added} invite(s).`);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const listGroups = async () => {
    try {
      const list = await api('/api/chats');
      setChats(list.filter((c) => c.name));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section id="group-fetch" className="panel">
      <h2>Fetch from a WhatsApp group</h2>
      <p className="muted">Pulls recent messages from a group and queues any invites it finds. Read-only — nothing is sent.</p>
      <div className="row">
        <input
          id="group-name"
          type="text"
          placeholder="Group or chat name (e.g. Family)"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        />
        <input
          id="group-limit"
          type="number"
          min="1"
          max="100"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
        />
        <button className="btn primary" onClick={fetchInvites} disabled={!ready || busy}>
          {busy ? 'Fetching…' : 'Fetch recent invites'}
        </button>
        <button className="btn ghost" onClick={listGroups} disabled={!ready}>List my groups</button>
      </div>
      {chats && (
        <div className="group-list">
          {chats.length === 0
            ? <span className="muted">No chats synced yet. Open WhatsApp on your phone.</span>
            : chats.map((c) => (
                <button key={c.id || c.name} className="chip" onClick={() => setGroup(c.name)}>
                  {c.isGroup ? '👥 ' : ''}{c.name}
                </button>
              ))}
        </div>
      )}
    </section>
  );
}
