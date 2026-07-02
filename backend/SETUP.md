# Setup guide

Follow these once. After that, day-to-day use is just `npm start`.

## 0. Fastest path: one command

```bash
./install.sh
```

This checks for Node.js (installs it via nvm if missing), runs `npm install`, and
creates your `.env`. Then skip to **step 4** (Google Calendar). If you prefer to do
it by hand, follow steps 1–3 below.

> Manual-mode only? `SKIP_PUPPETEER=1 ./install.sh` avoids the ~150 MB Chromium download.

---

## 1. Install Node.js (macOS, you don't have it yet)

The cleanest way is **nvm** (Node Version Manager), so Node updates never need `sudo`:

```bash
# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# close & reopen Terminal, then:
nvm install --lts
node -v   # should print v20.x or v22.x
```

Prefer Homebrew instead? `brew install node` also works (needs Homebrew installed).

## 2. Install project dependencies

```bash
cd "$(dirname "path-to-this-folder")"   # or just: cd into the project folder
npm install
```

> The first install pulls Puppeteer (a headless Chrome), which is ~150 MB. That's
> only needed for live WhatsApp mode. If you only want manual paste mode, set
> `WHATSAPP_MODE=manual` in `.env` and you can skip the heavy bits.

## 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set at least:
- `DEFAULT_TIMEZONE` — e.g. `Asia/Kolkata`
- `WHATSAPP_WATCH` — comma-separated chat/group names to monitor (leave blank = all)
- `WHATSAPP_MODE` — `whatsapp-web` (live) or `manual`
- `LOCATION_MODE` — keep `manual` (you chose manual confirmation)

## 4. Set up Google Calendar API (OAuth2)

You need an OAuth **Desktop app** client. Steps in Google Cloud Console:

1. Go to <https://console.cloud.google.com/> and create a project (e.g. "wa-calendar").
2. **APIs & Services → Library** → search **Google Calendar API** → **Enable**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External** (fine for personal use).
   - Fill app name + your email. Save.
   - Under **Test users**, add your own Google account. (While the app is in
     "Testing" status you don't need Google verification — only your test users
     can authorize, which is exactly what you want.)
   - Scopes: you can leave default; the app requests `calendar.events` at runtime.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Desktop app**.
   - Create, then **Download JSON**.
5. Save that file as `credentials.json` in the project root (or point
   `GOOGLE_CREDENTIALS_PATH` at it).

> Note: the app uses a local redirect (`http://localhost:5454/oauth2callback`)
> during the consent flow. For a Desktop-app client this works out of the box —
> no need to register the redirect URI manually.

Then authorize once:

```bash
npm run auth
```

This opens your browser, you approve, and a token is cached in `tokens/`.
(You can also click **Connect Google** in the dashboard.)

## 5. Run it

```bash
npm start
```

Open <http://localhost:3000>.

- **Live mode:** scan the QR code with WhatsApp → **Settings → Linked Devices →
  Link a Device**. You only scan once; the session persists in `.wwebjs_auth/`.
- **Manual mode:** just paste invite text into the dashboard.

## Verifying the parser without any setup

```bash
npm run test:parse
```

Runs detection + parsing on sample messages. No WhatsApp, no Google, no network.
