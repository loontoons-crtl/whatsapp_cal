import 'dotenv/config';
import path from 'node:path';

const root = process.cwd();

function abs(p) {
  if (!p) return p;
  return path.isAbsolute(p) ? p : path.join(root, p);
}

export const config = {
  port: Number(process.env.PORT) || 3000,

  whatsapp: {
    // "whatsapp-web" | "manual"
    mode: (process.env.WHATSAPP_MODE || 'whatsapp-web').trim(),
    // chat/group names to monitor (lower-cased for matching)
    watch: (process.env.WHATSAPP_WATCH || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    // Per-person session id so multiple family members can each have their own
    // persistent WhatsApp login without colliding (LocalAuth clientId). Blank = default.
    sessionId: (process.env.WHATSAPP_SESSION_ID || '').trim(),
    sessionPath: (process.env.WHATSAPP_SESSION_PATH || '').trim(),
  },

  google: {
    credentialsPath: abs(process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json'),
    tokenPath: abs(process.env.GOOGLE_TOKEN_PATH || './tokens/google-token.json'),
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    timezone: process.env.DEFAULT_TIMEZONE || 'UTC',
  },

  location: {
    // "manual" | "auto" | "places"
    //  manual = ask the user to paste an address/link for vague locations
    //  auto   = generate a Google Maps search link from the text automatically (no API key)
    //  places = resolve via Google Places API (needs GOOGLE_PLACES_API_KEY)
    mode: (process.env.LOCATION_MODE || 'manual').trim(),
    placesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
    defaultRegion: process.env.LOCATION_DEFAULT_REGION || '',
    // Optional standing location used when a message has none (so you never type one).
    // Leave blank to just create the event with no location.
    defaultLocation: (process.env.DEFAULT_LOCATION || '').trim(),
  },

  // Auto-create: when on, fully-resolved invites become Calendar events with no
  // manual "Confirm" click. Off by default (confirm-before-create is the safe default).
  autoCreate: ['1', 'true', 'yes', 'on'].includes((process.env.AUTO_CREATE || '').trim().toLowerCase()),
  // When auto-creating, require a definite parsed time (not just a date). Default true,
  // so date-only invites still wait for you to set a time instead of guessing.
  autoCreateRequireTime: !['0', 'false', 'no', 'off'].includes((process.env.AUTO_CREATE_REQUIRE_TIME || '').trim().toLowerCase()),

  // Reminders (minutes before start). Spec: 1 day + 4 hours.
  reminders: [24 * 60, 4 * 60],
};

export function watchListMatches(chatName) {
  if (!config.whatsapp.watch.length) return true; // empty = match all (still confirm-gated)
  const name = (chatName || '').toLowerCase();
  return config.whatsapp.watch.some((w) => name.includes(w.toLowerCase()));
}
