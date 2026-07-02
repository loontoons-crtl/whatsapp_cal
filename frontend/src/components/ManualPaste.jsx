import { useState } from 'react';
import { postJSON } from '../api.js';

export default function ManualPaste({ onAdded }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      await postJSON('/api/invites/manual', { text: t });
      setText('');
      onAdded?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <h2>Paste an invite (manual fallback)</h2>
      <textarea
        rows="4"
        placeholder="Forward or paste invite text here…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="btn primary" onClick={submit} disabled={busy}>
        {busy ? 'Parsing…' : 'Parse invite'}
      </button>
    </section>
  );
}
