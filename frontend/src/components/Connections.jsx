import { useState } from 'react';
import { postJSON } from '../api.js';

export default function Connections({ status, onChanged }) {
  const s = status || {};
  const [busy, setBusy] = useState(false);

  const connectGoogle = async () => {
    try {
      await postJSON('/api/google/connect');
      alert('Consent screen opened in your browser. Approve, then this page will update.');
    } catch (err) {
      alert(err.message);
    }
  };

  const call = async (path, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    try { await postJSON(path); onChanged?.(); }
    catch (err) { alert(err.message); }
    finally { setBusy(false); }
  };

  const logout = () => call('/api/whatsapp/logout', 'Log out of WhatsApp on this app? You’ll scan a QR again to re-link.');
  const rescan = () => call('/api/whatsapp/rescan');

  const googleConnected = s.googleConnected;
  const isLive = s.whatsappMode && s.whatsappMode !== 'manual';
  const wa = !isLive
    ? { text: 'manual mode', cls: 'badge' }
    : { text: s.whatsappReady ? 'connected' : 'waiting for QR scan', cls: 'badge ' + (s.whatsappReady ? 'ok' : 'bad') };

  return (
    <section className="panel">
      <h2>Connections</h2>
      <div className="row">
        <div className="conn">
          <strong>Google Calendar</strong>
          <span className={'badge ' + (googleConnected ? 'ok' : 'bad')}>
            {googleConnected ? 'connected' : 'not connected'}
          </span>
          {!googleConnected && (
            <button className="btn" onClick={connectGoogle}>Connect Google</button>
          )}
        </div>
        <div className="conn">
          <strong>WhatsApp</strong>
          <span className={wa.cls}>{wa.text}</span>
          {isLive && s.whatsappReady && (
            <button className="btn ghost" onClick={logout} disabled={busy}>Log out</button>
          )}
          {isLive && !s.whatsappReady && (
            <button className="btn ghost" onClick={rescan} disabled={busy}>New QR</button>
          )}
        </div>
      </div>

      {isLive && s.qr && !s.whatsappReady && (
        <div className="qr-wrap">
          <p>Scan once with WhatsApp → Linked Devices:</p>
          <img src={s.qr} alt="WhatsApp QR" />
          <div>
            <button className="btn ghost" onClick={rescan} disabled={busy}>Refresh QR</button>
          </div>
        </div>
      )}
    </section>
  );
}
