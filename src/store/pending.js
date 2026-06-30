import { randomUUID } from 'node:crypto';

/**
 * In-memory queue of parsed invite drafts awaiting user review.
 * Drafts live only for the session — nothing is persisted, nothing auto-creates.
 */
class PendingStore {
  constructor() {
    this.items = new Map(); // id -> draft
  }

  add(draft) {
    const id = randomUUID();
    const record = { id, status: 'pending', ...draft };
    this.items.set(id, record);
    return record;
  }

  list() {
    return [...this.items.values()].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  get(id) {
    return this.items.get(id);
  }

  update(id, patch) {
    const cur = this.items.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    this.items.set(id, next);
    return next;
  }

  remove(id) {
    this.items.delete(id);
  }
}

export const pending = new PendingStore();
