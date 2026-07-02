# Invite → Google Calendar

Turns event invites (WhatsApp, or shared text / PDF / image) into Google Calendar
events. Split into a **backend API** and a **React frontend**.

```
tanmay/
  backend/      Express API — parsing, WhatsApp, Google Calendar, share endpoint
    src/
      config.js
      index.js            entry (starts API + WhatsApp adapter)
      server/app.js       all API routes
      invite/             detector, parser, location
      i18n/               numerals, keywords, temporal (Hindi/Hinglish)
      google/             OAuth + calendar create + template link
      whatsapp/           adapters (live web + manual) — live is optional
      share/extract.js    text / PDF / image (Claude vision) extraction
      store/pending.js    in-memory review queue
    scripts/test-parse.js
  frontend/     React + Vite dashboard (PWA + share target)
    src/
      main.jsx            router (/ dashboard, /share)
      api.js              fetch helper
      pages/              Dashboard, Share
      components/         StatusBar, Connections, GroupFetch, ManualPaste,
                          InviteList, InviteCard
    public/               manifest.webmanifest, sw.js, icons
  android/      Gradle project scaffold (for packaging the PWA)
```

## Run it locally (two terminals)

**1. Backend** (API on :3000)
```bash
cd backend
npm install            # first time (PUPPETEER_SKIP_DOWNLOAD=1 to skip Chromium)
npm run auth           # one-time Google authorization (see backend/SETUP.md)
npm start
```

**2. Frontend** (React dev server on :5173, proxies /api → :3000)
```bash
cd frontend
npm install            # first time
npm run dev            # open http://localhost:5173
```

## Production (one server)

Build the frontend; the backend serves it at `/` **only** when `SERVE_FRONTEND=true`
(or `NODE_ENV=production`). In dev it stays API-only, so you never see the same UI on
two ports:
```bash
cd frontend && npm run build      # outputs frontend/dist
cd ../backend && npm run serve    # serves the API + the built app on :3000
```

> Dev vs prod, at a glance:
> - **Dev:** backend `npm start` (:3000, API only) + frontend `npm run dev` (:5173, the UI).
> - **Prod:** `npm run build` then backend `npm run serve` (:3000 serves everything).

## Configuration

All settings live in `backend/.env` (see `backend/.env.example`). Key flags:

- `WHATSAPP_MODE` — `manual` (paste/share only) or `whatsapp-web` (live monitoring)
- `AUTO_CREATE=true` — create events automatically, no manual confirm
- `LOCATION_MODE=auto` — auto Google Maps link; never requires a location
- `ANTHROPIC_API_KEY` — enables reading **image** invites via Claude vision (text/PDF need no key)

## Features (all preserved from the original)

- Manual paste, live WhatsApp monitoring, and per-group fetch
- Multilingual detection + date parsing (English, Hinglish, Hindi & other Indian scripts)
- Auto Google Maps links; confirm-to-create **or** fully automatic
- Share endpoint (`/api/share`) for text / PDF / image → the PWA share target uses it
- Google Calendar events with 1-day + 4-hour reminders

See **backend/SETUP.md** (Google setup), **FAMILY.md** (multi-person), **ANDROID.md** (APK).
