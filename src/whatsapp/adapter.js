/**
 * WhatsApp adapter contract.
 *
 * The rest of the app only knows about this interface, so the live WhatsApp Web
 * integration can be swapped for the manual paste-in adapter (or replaced entirely
 * if WhatsApp breaks the unofficial library) without touching parsing/calendar code.
 *
 * Events emitted on the EventEmitter returned by start():
 *   'qr'        (dataUrl)            -> QR code to scan (whatsapp-web mode only)
 *   'ready'     ()                   -> client authenticated and listening
 *   'message'   ({ text, chatName, fromMe, id, timestamp })
 *   'disconnected' (reason)
 *
 * An adapter must expose:
 *   start(): EventEmitter
 *   stop(): Promise<void>
 *   mode: string
 */

import { EventEmitter } from 'node:events';
import { config } from '../config.js';

export async function createWhatsAppAdapter() {
  if (config.whatsapp.mode === 'manual') {
    const { ManualAdapter } = await import('./manualAdapter.js');
    return new ManualAdapter();
  }
  // default: live WhatsApp Web
  const { WhatsAppWebAdapter } = await import('./whatsappWebAdapter.js');
  return new WhatsAppWebAdapter();
}

// Shared base so adapters are interchangeable.
export class BaseAdapter extends EventEmitter {
  constructor(mode) {
    super();
    this.mode = mode;
  }
  start() { throw new Error('not implemented'); }
  async stop() {}
}
