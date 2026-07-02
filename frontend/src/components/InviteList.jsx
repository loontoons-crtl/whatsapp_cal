import InviteCard from './InviteCard.jsx';

export default function InviteList({ invites, onChanged }) {
  return (
    <section className="panel">
      <h2>Pending invites {invites.length > 0 && <span className="badge">{invites.length}</span>}</h2>
      {invites.length === 0
        ? <p className="muted">No invites yet. Paste one above, or wait for WhatsApp.</p>
        : invites.map((inv) => <InviteCard key={inv.id} invite={inv} onChanged={onChanged} />)}
    </section>
  );
}
