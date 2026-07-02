import { google } from 'googleapis';
import { config } from '../config.js';
import { getAuthorizedClientSync } from './auth.js';

/**
 * Build a pre-filled Google Calendar "create event" link (no login needed).
 * Used as a fallback so a shared invite always yields a one-tap way to save it.
 */
export function calendarTemplateLink(draft) {
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({ action: 'TEMPLATE', text: draft.title || 'Event' });
  if (draft.start) {
    const end = draft.end || new Date(new Date(draft.start).getTime() + 2 * 60 * 60 * 1000).toISOString();
    params.set('dates', `${fmt(draft.start)}/${fmt(end)}`);
  }
  const loc = draft.location?.value || draft.location?.mapsLink;
  if (loc) params.set('location', loc);
  const details = [draft.host && `Host: ${draft.host}`, draft.location?.mapsLink && `Map: ${draft.location.mapsLink}`, draft.notes]
    .filter(Boolean).join('\n');
  if (details) params.set('details', details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Create a Google Calendar event from a CONFIRMED invite draft.
 *
 * This is only ever called after the user approves the confirmation summary in
 * the dashboard — there is no auto-create path. The caller is responsible for
 * ensuring date/time/location were resolved (no ambiguous fields remain).
 */
export async function createCalendarEvent(confirmed) {
  const auth = getAuthorizedClientSync();
  if (!auth) throw new Error('Google Calendar not connected. Run `npm run auth` or click "Connect Google".');

  const calendar = google.calendar({ version: 'v3', auth });

  if (!confirmed.start) throw new Error('Cannot create event: start date/time missing.');
  const start = new Date(confirmed.start);
  const end = confirmed.end ? new Date(confirmed.end) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  // Location: prefer the readable address (Calendar makes it mappable); fall back
  // to the link if all we have is a URL. The Maps link always goes in the notes.
  const loc = confirmed.location || {};
  const valueIsUrl = /^https?:\/\//i.test(loc.value || '');
  const location = (loc.value && !valueIsUrl) ? loc.value : (loc.mapsLink || loc.value || '');

  const descriptionLines = [];
  if (confirmed.host) descriptionLines.push(`Host: ${confirmed.host}`);
  if (loc.mapsLink) descriptionLines.push(`Map: ${loc.mapsLink}`);
  if (confirmed.notes) descriptionLines.push(confirmed.notes);
  if (confirmed.chatName) descriptionLines.push(`\nSource: WhatsApp (${confirmed.chatName})`);
  if (confirmed.rawText) descriptionLines.push(`\n--- Original message ---\n${confirmed.rawText}`);

  const requestBody = {
    summary: confirmed.title || 'Event',
    location,
    description: descriptionLines.join('\n').trim() || undefined,
    start: { dateTime: start.toISOString(), timeZone: confirmed.timezone || config.google.timezone },
    end: { dateTime: end.toISOString(), timeZone: confirmed.timezone || config.google.timezone },
    reminders: {
      useDefault: false,
      // Spec: 1 day before + 4 hours before.
      overrides: config.reminders.map((minutes) => ({ method: 'popup', minutes })),
    },
  };

  const res = await calendar.events.insert({
    calendarId: config.google.calendarId,
    requestBody,
  });

  return {
    id: res.data.id,
    htmlLink: res.data.htmlLink,
    summary: res.data.summary,
    start: res.data.start,
    location: res.data.location,
  };
}
