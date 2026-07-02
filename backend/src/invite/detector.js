import * as chrono from 'chrono-node';
import { ALL_KEYWORDS } from '../i18n/keywords.js';
import { normalizeForParsing } from '../i18n/temporal.js';

const TIME_HINT = /\b(\d{1,2}\s?(?:am|pm)|\d{1,2}:\d{2}|noon|midnight|tonight|tomorrow|this (?:weekend|sat|sun)|next (?:week|month|sat|sun))\b/i;

// Address/location hints across English + romanized + native scripts.
const LOCATION_HINT = /\b(road|rd|street|st|avenue|ave|lane|ln|block|sector|floor|apartment|apt|hall|hotel|cafe|restaurant|marg|nagar|colony|society|gali|chowk|mandir|temple)\b/i;
const NATIVE_LOCATION_HINT = /(रोड|मार्ग|नगर|कॉलोनी|सोसायटी|गली|चौक|मंदिर|हॉल|होटल|पता|स्थान)/;
const MAPS_LINK = /maps\.(app\.)?goo\.gl|google\.com\/maps/i;

/**
 * Score a message for invite-likeness across languages. Returns { isInvite, score, signals }.
 * Detection is a hint only — nothing is created without explicit user confirmation.
 */
export function detectInvite(text) {
  if (!text || typeof text !== 'string') {
    return { isInvite: false, score: 0, signals: [] };
  }
  const lower = text.toLowerCase();
  const signals = [];
  let score = 0;

  // Keyword match: lowercase comparison works for Latin; native-script terms are
  // case-insensitive by nature, so substring-on-original covers them too.
  const matched = ALL_KEYWORDS.filter((k) => {
    const kl = k.toLowerCase();
    return lower.includes(kl) || text.includes(k);
  });
  if (matched.length) {
    score += Math.min(matched.length, 3);
    signals.push(`keywords: ${matched.slice(0, 5).join(', ')}`);
  }

  // chrono on the language-normalized text so Hindi/Hinglish dates are seen.
  const { text: normalized } = normalizeForParsing(text);
  const dates = chrono.parse(normalized, new Date(), { forwardDate: true });
  if (dates.length) {
    score += 2;
    signals.push(`date/time reference: "${dates[0].text}"`);
  }

  if (TIME_HINT.test(normalized)) {
    score += 1;
    signals.push('time-of-day hint');
  }

  if (LOCATION_HINT.test(text) || NATIVE_LOCATION_HINT.test(text) || MAPS_LINK.test(text)) {
    score += 1;
    signals.push('location hint');
  }

  return { isInvite: score >= 3, score, signals };
}
