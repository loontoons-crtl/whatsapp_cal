import { useCallback, useEffect, useState } from 'react';
import { getJSON } from '../api.js';
import StatusBar from '../components/StatusBar.jsx';
import Connections from '../components/Connections.jsx';
import GroupFetch from '../components/GroupFetch.jsx';
import ManualPaste from '../components/ManualPaste.jsx';
import InviteList from '../components/InviteList.jsx';

export default function Dashboard() {
  const [status, setStatus] = useState(null);
  const [invites, setInvites] = useState([]);

  const refreshStatus = useCallback(async () => {
    try { setStatus(await getJSON('/api/status')); }
    catch (e) { setStatus((s) => ({ ...(s || {}), lastError: e.message })); }
  }, []);

  const refreshInvites = useCallback(async () => {
    try { setInvites(await getJSON('/api/invites')); }
    catch { /* keep last list */ }
  }, []);

  useEffect(() => {
    refreshStatus();
    refreshInvites();
    const a = setInterval(refreshStatus, 3000);
    const b = setInterval(refreshInvites, 4000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [refreshStatus, refreshInvites]);

  return (
    <>
      <header>
        <h1>Invite → Google Calendar</h1>
        <StatusBar status={status} />
      </header>
      <main>
        <Connections status={status} onChanged={refreshStatus} />
        <GroupFetch status={status} onAdded={refreshInvites} />
        <ManualPaste onAdded={refreshInvites} />
        <InviteList invites={invites} onChanged={refreshInvites} />
      </main>
    </>
  );
}
