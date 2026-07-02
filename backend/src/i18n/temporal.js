// Translate Hindi (Devanagari) and Hinglish (romanized) temporal expressions into
// plain English so chrono-node's English parser can read them. We don't try to be a
// full translator — just enough to capture dates, weekdays, months and clock times.
//
// Strategy:
//   1. normalize Indic digits to ASCII (done by caller / numerals.js)
//   2. fold "<period> <n> baje" / "<n> baje <period>" into "<n>am/pm"
//   3. swap relative-day / weekday / month / phrase words for English equivalents
//
// Output is meant for the PARSER, not for display.

import { normalizeNumerals } from './numerals.js';

// time-of-day word -> meridiem
const PERIODS = {
  // am
  'subah': 'am', 'savere': 'am', 'savera': 'am', 'pratah': 'am', 'morning': 'am',
  'सुबह': 'am', 'सवेरे': 'am', 'सवेरा': 'am', 'प्रातः': 'am', 'प्रात': 'am', 'भोर': 'am',
  // pm (afternoon / evening / night)
  'dopahar': 'pm', 'dupahar': 'pm', 'afternoon': 'pm',
  'दोपहर': 'pm',
  'shaam': 'pm', 'sham': 'pm', 'evening': 'pm',
  'शाम': 'pm', 'संध्या': 'pm',
  'raat': 'pm', 'ratri': 'pm', 'night': 'pm',
  'रात': 'pm', 'रात्रि': 'pm',
};
const PERIOD_ALT = Object.keys(PERIODS)
  .sort((a, b) => b.length - a.length)
  .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const BAJE = '(?:baje|बजे|bje|vaaje|वाजे)'; // "o'clock" marker (hi/mr)

// Phrase-level relative expressions (multiword first to avoid collisions like bare "is").
const PHRASES = [
  // [regex, replacement]
  [/\bagl[ei]\s+haft[ae]\b/gi, 'next week'],
  [/\bis\s+haft[ae]\b/gi, 'this week'],
  [/\bagl[ei]\s+mahin[ae]\b/gi, 'next month'],
  [/\bis\s+mahin[ae]\b/gi, 'this month'],
  [/\bagl[ei]\s+saal\b/gi, 'next year'],
  [/अगल[ेी]\s*सप्ताह/g, 'next week'],
  [/इस\s*सप्ताह/g, 'this week'],
  [/अगल[ेी]\s*हफ्त[ेा]/g, 'next week'],
  [/इस\s*हफ्त[ेा]/g, 'this week'],
  [/अगल[ेी]\s*महीन[ेा]/g, 'next month'],
  [/इस\s*महीन[ेा]/g, 'this month'],
];

// Single-token swaps. Latin entries use word boundaries; native-script entries are
// replaced globally (distinct scripts, safe).
const WORDS = [
  // relative days
  ['aaj', 'today'], ['aj', 'today'], ['आज', 'today'],
  ['kal', 'tomorrow'], ['कल', 'tomorrow'],
  ['parson', 'in 2 days'], ['parso', 'in 2 days'], ['परसों', 'in 2 days'], ['परसो', 'in 2 days'],
  ['narson', 'in 3 days'], ['नरसों', 'in 3 days'],
  // weekdays
  ['somvar', 'Monday'], ['somwar', 'Monday'], ['सोमवार', 'Monday'],
  ['mangalvar', 'Tuesday'], ['mangalwar', 'Tuesday'], ['मंगलवार', 'Tuesday'],
  ['budhvar', 'Wednesday'], ['budhwar', 'Wednesday'], ['बुधवार', 'Wednesday'],
  ['guruvar', 'Thursday'], ['guruwar', 'Thursday'], ['brihaspativar', 'Thursday'],
  ['गुरुवार', 'Thursday'], ['बृहस्पतिवार', 'Thursday'],
  ['shukravar', 'Friday'], ['shukrawar', 'Friday'], ['शुक्रवार', 'Friday'],
  ['shanivar', 'Saturday'], ['shaniwar', 'Saturday'], ['शनिवार', 'Saturday'],
  ['ravivar', 'Sunday'], ['raviwar', 'Sunday'], ['itvar', 'Sunday'], ['itwar', 'Sunday'],
  ['रविवार', 'Sunday'], ['इतवार', 'Sunday'],
  // months (Hindi)
  ['जनवरी', 'January'], ['फरवरी', 'February'], ['फ़रवरी', 'February'], ['मार्च', 'March'],
  ['अप्रैल', 'April'], ['मई', 'May'], ['जून', 'June'], ['जुलाई', 'July'],
  ['अगस्त', 'August'], ['सितंबर', 'September'], ['सितम्बर', 'September'],
  ['अक्टूबर', 'October'], ['अक्तूबर', 'October'], ['नवंबर', 'November'], ['नवम्बर', 'November'],
  ['दिसंबर', 'December'], ['दिसम्बर', 'December'],
];

function isLatin(s) { return /^[a-z0-9 ]+$/i.test(s); }

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function applyWords(text) {
  let t = text;
  for (const [from, to] of WORDS) {
    if (isLatin(from)) {
      t = t.replace(new RegExp(`\\b${escapeRe(from)}\\b`, 'gi'), to);
    } else {
      t = t.split(from).join(to);
    }
  }
  return t;
}

function foldClockTimes(text) {
  let t = text;
  // period before number: "shaam 7 baje", "शाम 7", "evening 7:30"
  t = t.replace(
    new RegExp(`(${PERIOD_ALT})\\s*(\\d{1,2})(:\\d{2})?\\s*${BAJE}?`, 'gi'),
    (_m, period, h, min) => `${h}${min || ''}${PERIODS[period.toLowerCase()] || ''}`,
  );
  // number + baje + optional period: "7 baje shaam", "7 बजे", "7:30 baje raat"
  t = t.replace(
    new RegExp(`(\\d{1,2})(:\\d{2})?\\s*${BAJE}\\s*(${PERIOD_ALT})?`, 'gi'),
    (_m, h, min, period) => `${h}${min || ''}${period ? (PERIODS[period.toLowerCase()] || '') : ''}`,
  );
  return t;
}

/**
 * Produce an English-ish string for chrono. Also returns whether we detected a
 * non-Latin (regional) script, which the caller can use as a hint.
 */
export function normalizeForParsing(text) {
  if (!text) return { text: '', hadRegionalScript: false };
  const hadRegionalScript = /[ऀ-෿]/.test(text); // Devanagari..Malayalam blocks
  let t = normalizeNumerals(text);
  t = foldClockTimes(t);
  for (const [re, rep] of PHRASES) t = t.replace(re, rep);
  t = applyWords(t);
  // drop leftover particles that confuse chrono
  t = t.replace(/\bbaje\b/gi, ' ').replace(/बजे/g, ' ').replace(/\bko\b/gi, ' ').replace(/\s*को\s*/g, ' ');
  t = t.replace(/\s{2,}/g, ' ').trim();
  return { text: t, hadRegionalScript };
}
