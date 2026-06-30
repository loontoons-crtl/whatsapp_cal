# WhatsApp → Google Calendar

Pulls event invites from WhatsApp, parses them into structured events, and — **only
after you confirm** — creates Google Calendar events with location and reminders
(1 day + 4 hours before).

## ⚠️ Read this first: WhatsApp automation risk

Live mode uses **`whatsapp-web.js`**, which drives the real WhatsApp Web client
through a headless browser (Puppeteer). This is **unofficial and not sanctioned by
WhatsApp**:

- There is a real (usually small) risk your number gets **flagged or banned**,
  especially with automated/bot-like behavior. The app only *reads* messages from
  the chats you choose — it never sends anything — which keeps risk lower, but the
  risk is not zero.
- It can **break without warning** whenever WhatsApp changes their web client.

Because of this, the WhatsApp piece is **fully isolated behind a swappable adapter**.
You can switch to **manual paste-in mode** at any time by setting `WHATSAPP_MODE=manual`
in `.env` — everything else (parsing, confirmation, calendar creation) is identical.

**Nothing is ever added to your calendar without your explicit confirmation.**

## How it works

```
WhatsApp Web ─┐
              ├─▶ adapter ─▶ detect invite ─▶ parse (chrono-node) ─▶ pending queue
manual paste ─┘                                                          │
                                                                         ▼
                                              dashboard: review / edit / confirm
                                                                         │
                                                              (you click Confirm)
                                                                         ▼
                                                  Google Calendar event + reminders
```

- **Detection** — keyword + date/time + location heuristics flag likely invites.
  Low-signal messages are ignored; you can always paste anything manually.
- **Parsing** — `chrono-node` extracts date/time; title/host/location are pulled
  from the text. Vague locations like *"at Priya's place"* are marked **needs input**.
- **Clarify-first** — if date, time, or location is missing/ambiguous, the card
  shows what's needed. You can't confirm until it's resolved. No silent guessing.
- **Confirm-to-create** — you review the full summary (including location) and edit
  any field before the event is created.

## Project layout

```
src/
  config.js                 env + settings
  index.js                  entry point (starts dashboard + adapter)
  invite/
    detector.js             invite-likeness scoring
    parser.js               chrono-node parsing + field extraction
    location.js             location classify/resolve (manual; Places swappable)
  whatsapp/
    adapter.js              adapter contract + factory
    whatsappWebAdapter.js   live WhatsApp Web (isolated, unofficial)
    manualAdapter.js        paste-in fallback (no Puppeteer needed)
  google/
    auth.js                 OAuth2 consent + token cache
    calendar.js             event creation (location + reminders)
  server/
    app.js                  Express API
    public/                 dashboard UI
  store/pending.js          in-memory review queue
scripts/test-parse.js       offline parser smoke test
```

## Multi-lingual

Detection and date/time parsing work across **English, Hinglish (romanized Hindi),
Hindi (Devanagari), and other Indian languages** (Marathi, Bengali, Gujarati, Tamil,
Telugu, Kannada, Malayalam, Punjabi for keyword detection).

- **Numerals** in regional scripts (e.g. `७ बजे`, `८`) are normalized to ASCII.
- **Times** like `shaam 7 baje` / `शाम ७ बजे` → 7 PM, `kal raat 8 baje` → tomorrow 8 PM.
- **Weekdays, months, "agle hafte"/"अगले हफ्ते"** are understood.
- **Field labels** (`स्थान:`, `jagah:`, `Venue:`) are recognized for location/host.

The i18n layer lives in `src/i18n/` (`numerals.js`, `keywords.js`, `temporal.js`).
Add words there to extend coverage. Date parsing is powered by `chrono-node` fed
through a Hindi/Hinglish → English normalizer.

## Quick start

The easiest path — **one command** that installs Node (if needed), deps, and `.env`:

```bash
./install.sh           # or: npm run setup
```

Then see **[SETUP.md](./SETUP.md)** for Google OAuth (one-time), and:

```bash
npm run auth           # one-time Google authorization
npm start              # open http://localhost:3000
```

Manual install instead:

```bash
npm install
cp .env.example .env    # edit DEFAULT_TIMEZONE, WHATSAPP_WATCH, etc.
```

Try the parser with no setup at all — including Hindi/Hinglish samples:
`npm run test:parse`.

> Tip: `SKIP_PUPPETEER=1 ./install.sh` skips the ~150 MB Chromium download if you
> only plan to use manual paste mode (`WHATSAPP_MODE=manual`).

## Switching off WhatsApp automation

Set `WHATSAPP_MODE=manual` in `.env` and restart. The dashboard's paste box feeds
the exact same pipeline. Use this if WhatsApp Web breaks or you'd rather not run
the unofficial library.

## Location resolution

You chose **manual confirmation**: vague locations prompt you to paste a full
address or Google Maps link before creating the event. To enable automatic
resolution later, set `LOCATION_MODE=places` and add `GOOGLE_PLACES_API_KEY`
in `.env` — the code path is already wired in `src/invite/location.js`.
