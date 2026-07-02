import { config } from './config.js';
import { createWhatsAppAdapter } from './whatsapp/adapter.js';
import { createServer } from './server/app.js';

async function main() {
  console.log('WhatsApp → Google Calendar');
  console.log(`  WhatsApp mode : ${config.whatsapp.mode}`);
  console.log(`  Location mode : ${config.location.mode}`);
  console.log(`  Watching      : ${config.whatsapp.watch.length ? config.whatsapp.watch.join(', ') : '(all chats)'}`);

  const adapter = await createWhatsAppAdapter();
  const app = createServer({ adapter });

  const server = app.listen(config.port, () => {
    console.log(`\n  Dashboard: http://localhost:${config.port}\n`);
    if (config.whatsapp.mode === 'whatsapp-web') {
      console.log('  Open the dashboard and scan the QR code to connect WhatsApp (first run only).');
    } else {
      console.log('  Manual mode: paste invite text in the dashboard.');
    }
  });

  // Friendly message instead of an unhandled-error crash when the port is taken.
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  Port ${config.port} is already in use — the app is probably already running in another terminal.`);
      console.error(`  Close that one, or start on a different port:  PORT=3001 npm start\n`);
      process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
  });

  adapter.start();

  const shutdown = async () => {
    console.log('\nShutting down…');
    await adapter.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
