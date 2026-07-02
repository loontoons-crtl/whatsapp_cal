import { BaseAdapter } from './adapter.js';
import { watchListMatches, config } from '../config.js';

/**
 * Live WhatsApp Web integration via whatsapp-web.js + Puppeteer.
 *
 * ⚠️ UNOFFICIAL: this drives the real WhatsApp Web client. WhatsApp does not
 * sanction it; there is some risk of your number being flagged/banned, and it
 * can break when WhatsApp changes their web client. This whole file is isolated
 * behind the adapter interface so you can switch WHATSAPP_MODE=manual at any time.
 *
 * whatsapp-web.js is loaded lazily so the manual mode never needs Puppeteer installed.
 */
export class WhatsAppWebAdapter extends BaseAdapter {
  constructor() {
    super('whatsapp-web');
    this.client = null;
  }

  start() {
    // Async init, but return `this` immediately so the server can attach listeners.
    this._init().catch((err) => this.emit('error', err));
    return this;
  }

  async _init() {
    const wweb = await import('whatsapp-web.js');
    const { Client, LocalAuth } = wweb.default ?? wweb;
    const qrcode = (await import('qrcode')).default;

    // Per-person session isolation: a unique clientId keeps each family member's
    // login in its own .wwebjs_auth/session-<id> folder (set via WHATSAPP_SESSION_ID).
    const localAuthOpts = {};
    if (config.whatsapp.sessionId) localAuthOpts.clientId = config.whatsapp.sessionId;
    if (config.whatsapp.sessionPath) localAuthOpts.dataPath = config.whatsapp.sessionPath;

    this.client = new Client({
      authStrategy: new LocalAuth(localAuthOpts), // persists session so you scan only once
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        // Use an existing Chrome/Chromium if PUPPETEER_EXECUTABLE_PATH is set
        // (handy when the bundled Chromium download was skipped or failed).
        ...(process.env.PUPPETEER_EXECUTABLE_PATH
          ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
          : {}),
      },
    });

    this.client.on('qr', async (qr) => {
      try {
        const dataUrl = await qrcode.toDataURL(qr);
        this.emit('qr', dataUrl);
      } catch {
        this.emit('qr', null);
      }
    });

    this.client.on('ready', () => this.emit('ready'));
    this.client.on('auth_failure', (m) => this.emit('error', new Error(`auth_failure: ${m}`)));
    this.client.on('disconnected', (reason) => this.emit('disconnected', reason));

    this.client.on('message', async (msg) => {
      try {
        const chat = await msg.getChat();
        const chatName = chat?.name || msg.from || '';
        // Only surface messages from watched chats/groups (empty watch list = all).
        if (!watchListMatches(chatName)) return;
        if (!msg.body) return;

        this.emit('message', {
          id: msg.id?._serialized || `${msg.from}-${msg.timestamp}`,
          text: msg.body,
          chatName,
          fromMe: !!msg.fromMe,
          timestamp: (msg.timestamp || Math.floor(Date.now() / 1000)) * 1000,
        });
      } catch (err) {
        this.emit('error', err);
      }
    });

    await this.client.initialize();
  }

  // Lets the dashboard list candidate chats so you can pick what to watch.
  async listChats() {
    if (!this.client) return [];
    const chats = await this.client.getChats();
    return chats.map((c) => ({ name: c.name, isGroup: c.isGroup, id: c.id?._serialized }));
  }

  /**
   * Pull recent messages from a named chat/group and return them normalized.
   * Unlike the live 'message' stream (new messages only), this reads history so
   * you can surface invites already sitting in a group. Read-only — sends nothing.
   *
   * @param {string} groupName  case-insensitive; exact match preferred, else substring
   * @param {number} limit      how many recent messages to pull (capped by caller)
   */
  async fetchGroupMessages(groupName, limit = 30) {
    if (!this.client) {
      throw new Error('WhatsApp is not connected yet — scan the QR code first.');
    }
    const target = (groupName || '').toLowerCase().trim();
    if (!target) throw new Error('Group name is required.');

    const chats = await this.client.getChats();
    const chat =
      chats.find((c) => (c.name || '').toLowerCase() === target) ||
      chats.find((c) => (c.name || '').toLowerCase().includes(target));
    if (!chat) {
      const sample = chats.map((c) => c.name).filter(Boolean).slice(0, 8).join(', ');
      throw new Error(
        `No chat matching "${groupName}". Open it once on your phone so it syncs, then retry. ` +
        (sample ? `Visible chats include: ${sample}.` : '')
      );
    }

    const msgs = await chat.fetchMessages({ limit });
    return msgs.map((m) => ({
      id: m.id?._serialized || `${m.from}-${m.timestamp}`,
      text: m.body || '',
      chatName: chat.name,
      fromMe: !!m.fromMe,
      timestamp: (m.timestamp || Math.floor(Date.now() / 1000)) * 1000,
    }));
  }

  async stop() {
    if (this.client) {
      try { await this.client.destroy(); } catch { /* ignore */ }
    }
  }
}
