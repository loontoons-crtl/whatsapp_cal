import { config } from '../config.js';

// Vague references that are NOT real addresses — we must ask the user.
const VAGUE_PATTERNS = [
  /\b(?:at|@)\s+[A-Z][a-z]+['’]s\s+(?:place|home|house|pad|apartment|flat)\b/, // "at Priya's place"
  /\bmy\s+(?:place|home|house)\b/i,
  /\bour\s+(?:place|home|house)\b/i,
  /\b(?:his|her|their)\s+(?:place|home|house)\b/i,
  /\bthe\s+usual\s+(?:spot|place)\b/i,
];

// Google location links in their many shared forms (maps app/short links, g.co, g.page, maps.google, …).
const MAPS_LINK = /(https?:\/\/(?:maps\.(?:app\.)?goo\.gl|goo\.gl\/maps|maps\.google\.[a-z.]+|(?:www\.)?google\.[a-z.]+\/maps|g\.co\/[^\s]+|g\.page\/[^\s]+)[^\s]*)/i;
// Any URL at all — so a pasted link of any kind is accepted as the location.
const ANY_URL = /(https?:\/\/[^\s]+)/i;

// Turn any free-text place into a clickable Google Maps search link (no API key needed).
export function mapsSearchLink(text) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
}

// Reasonably concrete location: maps link, or street/venue words, or a comma-separated address.
const CONCRETE_PATTERNS = [
  MAPS_LINK,
  /\b\d{1,4}\s+[A-Za-z][\w.\s]*\b(?:road|rd|street|st|avenue|ave|lane|ln|drive|dr|marg)\b/i,
  /\b(?:hotel|cafe|restaurant|club|hall|banquet|resort|stadium|auditorium|mall|park)\s+[A-Z][\w.&'\s-]{2,}/,
  /\b(?:sector|block|plot|floor)\s+[\w-]+/i,
  // 6-digit Indian PIN code — a strong signal of a real postal address.
  /\b\d{6}\b/,
  // Common Indian locality / address words (Bangalore-style "Cross"/"Main" too).
  /\b(?:nagar|colony|society|layout|circle|extension|enclave|vihar|puram|chowk|cross|cross\s*road|main\s*road|marg)\b/i,
];

/**
 * Classify a raw location string lifted from a message.
 * Returns { raw, status: 'concrete'|'vague'|'missing', value, mapsLink, needsUserInput }.
 */
export function classifyLocation(raw) {
  const text = (raw || '').trim();
  if (!text) {
    return { raw: '', status: 'missing', value: '', mapsLink: null, needsUserInput: true };
  }

  // A Google maps link (any shared form) — highest confidence.
  const linkMatch = text.match(MAPS_LINK);
  if (linkMatch) {
    return { raw: text, status: 'concrete', value: text, mapsLink: linkMatch[1], needsUserInput: false };
  }
  // Any other URL pasted as a location is accepted too.
  const urlMatch = text.match(ANY_URL);
  if (urlMatch) {
    return { raw: text, status: 'concrete', value: text, mapsLink: urlMatch[1], needsUserInput: false };
  }

  if (VAGUE_PATTERNS.some((re) => re.test(text))) {
    return { raw: text, status: 'vague', value: text, mapsLink: null, needsUserInput: true };
  }

  if (CONCRETE_PATTERNS.some((re) => re.test(text))) {
    return { raw: text, status: 'concrete', value: text, mapsLink: null, needsUserInput: false };
  }

  // Anything else: treat as ambiguous and ask, per spec ("never guess silently").
  return { raw: text, status: 'vague', value: text, mapsLink: null, needsUserInput: true };
}

/**
 * Resolve a location. In "manual" mode we never call out — the dashboard collects
 * a confirmed address/Maps link. In "places" mode we try Google Places first.
 * This function is intentionally swappable; the WhatsApp/calendar layers don't care how it works.
 */
export async function resolveLocation(classified, { city } = {}) {
  // auto: never ask the user — generate a Google Maps link from whatever text we have.
  if (config.location.mode === 'auto') {
    if (classified.mapsLink) {
      return { ...classified, status: 'concrete', needsUserInput: false, source: classified.source || 'link' };
    }
    // Use the message's location if present, else fall back to the standing default (if any).
    const value = classified.value || config.location.defaultLocation;
    if (value) {
      return {
        ...classified,
        value,
        status: 'concrete',
        mapsLink: mapsSearchLink([value, city || config.location.defaultRegion].filter(Boolean).join(' ')),
        needsUserInput: false,
        source: classified.value ? 'auto' : 'default',
      };
    }
    // No location anywhere — don't block; the event is just created without a location.
    return { ...classified, needsUserInput: false, source: 'auto' };
  }

  if (config.location.mode === 'places' && config.location.placesApiKey && classified.status !== 'concrete') {
    const resolved = await tryPlaces(classified.value, city || config.location.defaultRegion);
    if (resolved) {
      return { ...classified, status: 'concrete', value: resolved.address, mapsLink: resolved.mapsLink, needsUserInput: false, source: 'places' };
    }
  }
  // Manual / fallthrough: caller must confirm if needsUserInput.
  return { ...classified, source: 'manual' };
}

// --- Google Places (Text Search) — only used when LOCATION_MODE=places ---
async function tryPlaces(query, region) {
  try {
    const q = [query, region].filter(Boolean).join(' ');
    const url = `https://places.googleapis.com/v1/places:searchText`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.location.placesApiKey,
        'X-Goog-FieldMask': 'places.formattedAddress,places.displayName,places.id',
      },
      body: JSON.stringify({ textQuery: q }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;
    return {
      address: place.formattedAddress || place.displayName?.text || query,
      mapsLink: place.id ? `https://www.google.com/maps/place/?q=place_id:${place.id}` : null,
    };
  } catch {
    return null;
  }
}
