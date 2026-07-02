import { postJSON } from '../api.js';

export default function Connections({ status }) {
  const s = status || {};

  const connectGoogle = async () => {
    try {
      await postJSON('/api/google/connect');
      alert('Consent screen opened in your browser. Approve, then this page will update.');
    } catch (err) {
      alert(err.message);
    }
  };

  const googleConnected = s.googleConnected;
  const wa = s.whatsappMode === 'manual'
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
        </div>
      </div>

      {s.qr && !s.whatsappReady && (
        <div className="qr-wrap">
          <p>Scan once with WhatsApp → Linked Devices:</p>
          <img src={s.qr} alt="WhatsApp QR" />
        </div>
      )}
    </section>
  );
}
