// Smoke test for multilingual detection + parsing.
// No network, no WhatsApp, no Google. Run: npm run test:parse
import { detectInvite } from '../src/invite/detector.js';
import { parseInvite } from '../src/invite/parser.js';

const samples = [
  // English
  `You're invited! 🎉 Riya's birthday party this Saturday at 7pm. Venue: The Terrace Cafe, 12 MG Road. RSVP by Friday!`,
  `Housewarming at Priya's place next Sunday 6:30pm. Hope you can make it!`,
  `Hey, are we still on for coffee sometime?`, // not an invite
  // Hinglish
  `Shaadi hai is Saturday ko shaam 7 baje. Jagah: Hotel Grand, MG Road. Zaroor aana!`,
  `Mera birthday party kal raat 8 baje. Aap aamantrit ho!`,
  // Hindi (Devanagari)
  `आप सभी को निमंत्रण — विवाह समारोह शनिवार शाम ७ बजे। स्थान: होटल ग्रैंड, एमजी रोड।`,
  `जन्मदिन की पार्टी कल रात ८ बजे। पधारें!`,
  // Devanagari with maps link
  `गृह प्रवेश रविवार दोपहर १ बजे। स्थान: https://maps.app.goo.gl/xyz789`,
];

for (const text of samples) {
  const det = detectInvite(text);
  const draft = det.isInvite ? parseInvite(text, { source: 'manual' }) : null;
  console.log('\n────────────────────────────────────────');
  console.log('MSG :', text.replace(/\n/g, ' '));
  console.log('INVITE?', det.isInvite, `(score ${det.score})`, '| signals:', det.signals.join('; ') || '—');
  if (draft) {
    console.log('TITLE   :', draft.title);
    console.log('START   :', draft.start, draft.dateTimeAmbiguous ? '(time ambiguous)' : '');
    console.log('LOCATION:', draft.location.status, '→', draft.location.value || '—',
      draft.location.needsUserInput ? '[NEEDS INPUT]' : '');
    console.log('CLARIFY :', draft.clarifications.join(', ') || 'none');
  }
}

// assertions
let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

assert(detectInvite(samples[0]).isInvite, 'EN birthday should be invite');
assert(!detectInvite(samples[2]).isInvite, 'EN coffee should NOT be invite');

const hinglish = parseInvite(samples[3]);
assert(detectInvite(samples[3]).isInvite, 'Hinglish shaadi should be invite');
assert(!!hinglish.start, 'Hinglish should extract a date');
assert(!hinglish.dateTimeAmbiguous, 'Hinglish "shaam 7 baje" should yield a definite time');

const hindi = parseInvite(samples[5]);
assert(detectInvite(samples[5]).isInvite, 'Hindi vivah should be invite');
assert(!!hindi.start, 'Hindi should extract a date from Devanagari');
assert(!hindi.dateTimeAmbiguous, 'Hindi "शाम ७ बजे" should yield a definite time');

const ghar = parseInvite(samples[7]);
assert(ghar.location.status === 'concrete', 'Devanagari + maps link should be concrete location');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
