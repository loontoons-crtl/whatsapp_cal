// Normalize Indic (and Arabic-Indic) digit glyphs to ASCII 0-9 so that
// chrono-node and our regexes can read dates/times written in regional scripts.

const DIGIT_MAPS = [
  // Devanagari (Hindi/Marathi)  ० १ २ ...
  ['०१२३४५६७८९', '0123456789'],
  // Bengali / Assamese
  ['০১২৩৪৫৬৭৮৯', '0123456789'],
  // Gujarati
  ['૦૧૨૩૪૫૬૭૮૯', '0123456789'],
  // Gurmukhi (Punjabi)
  ['੦੧੨੩੪੫੬੭੮੯', '0123456789'],
  // Tamil
  ['௦௧௨௩௪௫௬௭௮௯', '0123456789'],
  // Telugu
  ['౦౧౨౩౪౫౬౭౮౯', '0123456789'],
  // Kannada
  ['೦೧೨೩೪೫೬೭೮೯', '0123456789'],
  // Malayalam
  ['൦൧൨൩൪൫൬൭൮൯', '0123456789'],
  // Odia
  ['୦୧୨୩୪୫୬୭୮୯', '0123456789'],
];

const lookup = new Map();
for (const [from, to] of DIGIT_MAPS) {
  for (let i = 0; i < from.length; i++) lookup.set(from[i], to[i]);
}

export function normalizeNumerals(text) {
  if (!text) return text;
  let out = '';
  for (const ch of text) out += lookup.get(ch) ?? ch;
  return out;
}
