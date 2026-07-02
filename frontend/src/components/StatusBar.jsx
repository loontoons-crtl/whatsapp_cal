export default function StatusBar({ status }) {
  if (!status) return <div className="status-bar">connecting…</div>;
  if (status.lastError) return <div className="status-bar">⚠ {status.lastError}</div>;
  const auto = status.autoCreate ? ' · ⚡ auto-create ON' : '';
  return (
    <div className="status-bar">
      reminders: 1 day &amp; 4 hours before · {status.timezone}{auto}
    </div>
  );
}
