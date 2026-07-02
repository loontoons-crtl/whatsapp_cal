import { BaseAdapter } from './adapter.js';

/**
 * Manual fallback: no automation, no Puppeteer, no account risk.
 * The dashboard's "paste invite text" box calls submitText(), which
 * flows through the exact same parsing/confirmation pipeline.
 */
export class ManualAdapter extends BaseAdapter {
  constructor() {
    super('manual');
  }

  start() {
    // Nothing to connect. Signal ready on next tick so listeners are attached first.
    setImmediate(() => this.emit('ready'));
    return this;
  }

  submitText(text, chatName = 'Manual paste') {
    this.emit('message', {
      id: `manual-${Date.now()}`,
      text,
      chatName,
      fromMe: false,
      timestamp: Date.now(),
    });
  }

  async stop() {}
}
