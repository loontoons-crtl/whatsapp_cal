import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { pending } from '../store/pending.js';
import { parseInvite } from '../invite/parser.js';
import { detectInvite } from '../invite/detector.js';
import { classifyLocation, resolveLocation } from '../invite/location.js';
import { createCalendarEvent, calendarTemplateLink } from '../google/calendar.js';
import { isAuthorized, runConsentFlow } from '../google/auth.js';
import { extractText } from '../share/extract.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve the built React frontend in production (frontend/dist), if present.
const FRONTEND_DIST = path.resolve(__dirname, '../../../frontend/dist');

export function createServer({ adapter }) {
  const app = express();
  app.use(cors()); // allow the Vite dev server (and the deployed frontend) to call the API
  app.use(express.json());

  // Shared runtime state surfaced to the UI.
  const state = {
    whatsappMode: config.whatsapp.mode,
    locationMode: config.location.mode,
    qr: null,
    whatsappReady: false,
    lastError: null,
  };

  // --- wire adapter events into the pending queue ---
  adapter.on('qr', (dataUrl) => { state.qr = dataUrl; });
  adapter.on('ready', () => { state.whatsappReady = true; state.qr = null; });
  adapter.on('disconnected', (r) => { state.whatsappReady = false; state.lastError = `WhatsApp disconnected: ${r}`; });
  adapter.on('error', (e) => { state.lastError = e.message; });

  // Skip a message we've already queued (same WhatsApp message id).
  function alreadyQueued(sourceId) {
    if (!sourceId) return false;
    return pending.list().some((p) => p.sourceId === sourceId);
  }

  // Resolve a fresh draft's location (auto/places modes upgrade it to a Maps link)
  // and recompute which fields still need the user.
  async function finalizeDraft(draft) {
    const location = await resolveLocation(draft.location);
    const clarifications = [];
    if (!draft.start) clarifications.push('date');
    else if (draft.dateTimeAmbiguous) clarifications.push('time');
    if (location.needsUserInput) clarifications.push('location');
    return { ...draft, location, clarifications };
  }

  // If AUTO_CREATE is on and an invite is fully resolved, create the event with no
  // manual confirm. Time-ambiguous invites are skipped unless AUTO_CREATE_REQUIRE_TIME=false.
  async function maybeAutoCreate(rec) {
    if (!config.autoCreate) return rec;
    if (!isAuthorized()) { state.lastError = 'Auto-create skipped: Google not connected.'; return rec; }
    if (!rec.start) return rec;
    if (config.autoCreateRequireTime && rec.dateTimeAmbiguous) return rec;
    if (rec.location?.needsUserInput) return rec;
    try {
      const event = await createCalendarEvent(rec);
      return pending.update(rec.id, { status: 'created', event, autoCreated: true });
    } catch (err) {
      state.lastError = `Auto-create failed: ${err.message}`;
      return rec;
    }
  }

  // Run one normalized WhatsApp message through detect → parse → resolve → queue
  // → (maybe) auto-create. Returns true if it was added as a pending invite.
  async function ingestMessage(msg) {
    if (msg.fromMe) return false;
    if (alreadyQueued(msg.id)) return false;
    const detection = detectInvite(msg.text);
    if (!detection.isInvite) return false; // low-signal messages are ignored
    let draft = parseInvite(msg.text, { source: msg.chatName ? 'whatsapp' : 'manual', chatName: msg.chatName });
    draft = await finalizeDraft(draft);
    const rec = pending.add({ ...draft, detection, sourceId: msg.id });
    await maybeAutoCreate(rec);
    return true;
  }

  adapter.on('message', (msg) => {
    ingestMessage(msg).catch((e) => { state.lastError = e.message; });
  });

  // --- status ---
  app.get('/api/status', (req, res) => {
    res.json({
      ...state,
      googleConnected: isAuthorized(),
      reminders: config.reminders,
      timezone: config.google.timezone,
      autoCreate: config.autoCreate,
    });
  });

  // --- pending invites ---
  app.get('/api/invites', (req, res) => res.json(pending.list()));

  // Shared pipeline: extract text from anything shared → detect → parse → resolve
  // → queue → maybe auto-create. Returns a result summary.
  async function processShare({ text, file }) {
    const extracted = await extractText({
      text,
      buffer: file?.buffer,
      mimetype: file?.mimetype,
      filename: file?.originalname,
    });
    if (!extracted.text) throw new Error('Could not read any text from that.');

    const detection = detectInvite(extracted.text);
    let draft = parseInvite(extracted.text, { source: 'share', chatName: `Shared ${extracted.kind}` });
    draft = await finalizeDraft(draft);
    let rec = pending.add({ ...draft, detection, shared: extracted.kind });
    rec = await maybeAutoCreate(rec);
    return {
      ok: true,
      kind: extracted.kind,
      detected: detection.isInvite,
      status: rec.status,
      created: rec.status === 'created',
      event: rec.event || null,
      calendarLink: rec.event?.htmlLink || calendarTemplateLink(rec),
      invite: rec,
    };
  }

  // --- SHARE (JSON API): entry point for the iPhone Shortcut and the PWA share page ---
  app.post('/api/share', upload.single('file'), async (req, res) => {
    const text = (req.body && req.body.text) || '';
    if (!text.trim() && !req.file) return res.status(400).json({ error: 'Share some text or a file (image/PDF).' });
    try {
      res.json(await processShare({ text, file: req.file }));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- SHARE (form target): Android share sheet POSTs here if the SW isn't active yet ---
  app.post('/share-target', upload.single('file'), async (req, res) => {
    const text = (req.body && (req.body.text || req.body.title || req.body.url)) || '';
    try {
      const r = await processShare({ text, file: req.file });
      const msg = r.created ? '✅ Event created on your calendar!'
        : r.detected ? 'Invite read — tap to add it.'
        : "That didn't look like an invite.";
      res.send(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
        <link rel=stylesheet href="/style.css"><main><section class="panel" style="text-align:center">
        <h2>${msg}</h2>
        <p><a class="btn primary" href="${r.calendarLink}" target="_blank">Open in Google Calendar</a></p>
        <p><a class="btn" href="/">← Dashboard</a></p></section></main>`);
    } catch (err) {
      res.status(500).send(`<!doctype html><meta charset=utf-8><link rel=stylesheet href="/style.css">
        <main><section class="panel"><h2>⚠ ${err.message}</h2><a class="btn" href="/">← Dashboard</a></section></main>`);
    }
  });

  // --- manual paste (fallback path) ---
  app.post('/api/invites/manual', async (req, res) => {
    const { text, chatName } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });
    const detection = detectInvite(text);
    let draft = parseInvite(text, { source: 'manual', chatName: chatName || 'Manual paste' });
    draft = await finalizeDraft(draft);
    let rec = pending.add({ ...draft, detection, manual: true });
    rec = await maybeAutoCreate(rec);
    res.json(rec);
  });

  // --- edit a draft (title, host, notes, start, end, location) ---
  app.patch('/api/invites/:id', async (req, res) => {
    const rec = pending.get(req.params.id);
    if (!rec) return res.status(404).json({ error: 'not found' });
    const patch = {};
    const b = req.body || {};
    for (const k of ['title', 'host', 'notes', 'start', 'end', 'timezone']) {
      if (b[k] !== undefined) patch[k] = b[k];
    }
    if (b.locationText !== undefined) {
      // Re-classify whatever the user typed/confirmed.
      let loc = classifyLocation(b.locationText);
      loc = await resolveLocation(loc);
      patch.location = loc;
    }
    // Recompute outstanding clarifications.
    const merged = { ...rec, ...patch };
    const clarifications = [];
    if (!merged.start) clarifications.push('date');
    else if (merged.dateTimeAmbiguous && b.start === undefined) clarifications.push('time');
    if (merged.location?.needsUserInput) clarifications.push('location');
    patch.clarifications = clarifications;
    if (b.start !== undefined) patch.dateTimeAmbiguous = false;

    res.json(pending.update(req.params.id, patch));
  });

  // --- confirm + create (the ONLY path that creates an event) ---
  app.post('/api/invites/:id/confirm', async (req, res) => {
    const rec = pending.get(req.params.id);
    if (!rec) return res.status(404).json({ error: 'not found' });
    if (!isAuthorized()) return res.status(412).json({ error: 'Google Calendar not connected.' });
    if (!rec.start) return res.status(400).json({ error: 'Date/time still missing — clarify before creating.' });
    if (rec.location?.needsUserInput) return res.status(400).json({ error: 'Location still needs confirmation.' });
    try {
      const event = await createCalendarEvent(rec);
      pending.update(req.params.id, { status: 'created', event });
      res.json({ ok: true, event });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/invites/:id/dismiss', (req, res) => {
    pending.remove(req.params.id);
    res.json({ ok: true });
  });

  // --- Google connect ---
  app.post('/api/google/connect', async (req, res) => {
    try {
      const open = (await import('open')).default;
      runConsentFlow({ onUrl: (u) => open(u).catch(() => {}) }).catch((e) => { state.lastError = e.message; });
      res.json({ ok: true, message: 'Consent screen opened in your browser.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- list watchable chats (whatsapp-web mode only) ---
  app.get('/api/chats', async (req, res) => {
    if (typeof adapter.listChats !== 'function') return res.json([]);
    if (!state.whatsappReady) return res.json([]); // client not linked yet
    try { res.json(await adapter.listChats()); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // --- fetch recent messages from a named group and queue any invites found ---
  app.post('/api/whatsapp/fetch', async (req, res) => {
    if (typeof adapter.fetchGroupMessages !== 'function') {
      return res.status(400).json({ error: 'Live WhatsApp is off. Set WHATSAPP_MODE=whatsapp-web and restart.' });
    }
    if (!state.whatsappReady) {
      return res.status(409).json({ error: 'WhatsApp not connected yet — scan the QR code first.' });
    }
    const { group, limit } = req.body || {};
    if (!group || !group.trim()) return res.status(400).json({ error: 'group name required' });
    const cap = Math.min(Math.max(Number(limit) || 30, 1), 100);
    try {
      const msgs = await adapter.fetchGroupMessages(group.trim(), cap);
      let added = 0;
      for (const msg of msgs) if (await ingestMessage(msg)) added++;
      res.json({ ok: true, group: group.trim(), scanned: msgs.length, added });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- serve the built React frontend (production) with SPA fallback ---
  if (fs.existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST));
    app.get(/^(?!\/api\/|\/share-target).*/, (req, res) => {
      res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
    });
  }

  return app;
}
