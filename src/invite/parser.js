import * as chrono from 'chrono-node';
import { config } from '../config.js';
import { classifyLocation } from './location.js';
import { FIELD_LABELS } from '../i18n/keywords.js';
import { normalizeForParsing } from '../i18n/temporal.js';

const DEFAULT_DURATION_MIN = 120; // assume 2h if no end time given

// Build a labeled-field regex from multilingual label words.
// Matches "Label: value" / "Label - value" in any of the supplied languages.
function labelRegex(labels) {
  const alt = labels
    .sort((a, b) => b.length - a.length)
    .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return new RegExp(`(?:${alt})\\s*[:\\-–]\\s*(.+)`, 'i');
}

const LOC_LABEL = labelRegex(FIELD_LABELS.location);
const HOST_LABEL = labelRegex(FIELD_LABELS.host);
const TITLE_LABEL = labelRegex(FIELD_LABELS.title);
const MAPS_LINK = /(https?:\/\/(?:maps\.(?:app\.)?goo\.gl|goo\.gl\/maps|maps\.google\.[a-z.]+|(?:www\.)?google\.[a-z.]+\/maps|g\.co\/[^\s]+|g\.page\/[^\s]+)[^\s]*)/i;
const ANY_URL = /(https?:\/\/[^\s]+)/i;

function extractLocationText(text) {
  const labeled = text.match(LOC_LABEL);
  if (labeled) {
    let v = labeled[1].split('\n')[0];
    // Stop at sentence boundaries (incl. Hindi danda "।") and closing phrases.
    v = v.split(/[!?।]/)[0];
    v = v.replace(/\s*\b(?:rsvp|please rsvp|kindly rsvp|zaroor aana|jaroor aana|zaroor aaiye|aap aamantrit|padhar\w*)\b.*$/i, '');
    return v.trim().replace(/[.,;।]\s*$/, '');
  }
  const mapsLink = text.match(MAPS_LINK);
  if (mapsLink) return mapsLink[1];
  // Any other link in the message is taken as the location too.
  const anyUrl = text.match(ANY_URL);
  if (anyUrl) return anyUrl[1];

  // "at <Place>" (English) — kept conservative.
  const atPhrase = text.match(/\b(?:at|@)\s+([A-Z][\w.&'’\s-]{2,60}?)(?:[.,!\n]|$)/);
  if (atPhrase) return atPhrase[1].trim();

  return '';
}

function extractHost(text) {
  const labeled = text.match(HOST_LABEL);
  return labeled ? labeled[1].split('\n')[0].trim().replace(/[.,;]\s*$/, '') : '';
}

function extractTitle(text) {
  const labeled = text.match(TITLE_LABEL);
  if (labeled) return labeled[1].split('\n')[0].trim();

  // First clause: break on line breaks, sentence enders, and Hindi danda "।".
  const firstClause = text.split(/[।\n!?]|\.\s/).map((s) => s.trim()).find(Boolean) || '';
  if (firstClause && firstClause.length <= 80) return firstClause;
  return firstClause.slice(0, 80) || 'Untitled event';
}

/**
 * Parse a free-text message (any supported language) into a structured but
 * UNCONFIRMED invite draft. Marks fields needing clarification. Creates nothing.
 */
export function parseInvite(text, { source = 'manual', chatName = '' } = {}) {
  const clean = (text || '').trim();

  // --- date/time (parse on language-normalized text) ---
  const { text: normalized, hadRegionalScript } = normalizeForParsing(clean);
  const results = chrono.parse(normalized, new Date(), { forwardDate: true });
  const primary = results[0];
  let start = null;
  let end = null;
  let dateTimeAmbiguous = true;
  let dateText = '';

  if (primary) {
    dateText = primary.text;
    start = primary.start ? primary.start.date() : null;
    end = primary.end ? primary.end.date() : null;
    const knownTime = primary.start?.isCertain('hour');
    dateTimeAmbiguous = !start || !knownTime;
    if (start && !end) end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60000);
  }

  // --- location (extract from original text to preserve script/address) ---
  const locText = extractLocationText(clean);
  const location = classifyLocation(locText);

  // --- other ---
  const title = extractTitle(clean);
  const host = extractHost(clean);

  const clarifications = [];
  if (!start) clarifications.push('date');
  else if (dateTimeAmbiguous) clarifications.push('time');
  if (location.needsUserInput) clarifications.push('location');

  return {
    source,
    chatName,
    rawText: clean,
    language: hadRegionalScript ? 'regional-script' : 'latin',
    title,
    host,
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null,
    dateText,
    dateTimeAmbiguous,
    timezone: config.google.timezone,
    location,
    clarifications,
    createdAt: new Date().toISOString(),
  };
}
