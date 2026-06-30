# Getting the Android app (.apk)

The app is now an installable **PWA with a share target** — share any invite
(text / photo / PDF) into it and it auto-creates the calendar event. To turn that
into a real `.apk` for Android 13+, there's no Android Studio needed; we use a
**cloud builder**.

## Why hosting is required first
An APK built this way is a thin wrapper (a "Trusted Web Activity") that opens your
hosted app. So the app must be reachable on a public **HTTPS** URL. Two needs:
1. A host for the Node server (free tier is fine).
2. Each person's Google token must persist on the host (so "fully automatic" keeps
   working) — a small token store, not the local file.

## Step 1 — Host it (one time)
Deploy this repo to any Node host (Render, Railway, Fly, etc.). You'll get a URL like
`https://invite2cal.onrender.com`. Make sure opening it in a phone browser shows the
dashboard and you can connect Google there.

## Step 2 — Generate the APK (no toolchain)
1. Go to **https://www.pwabuilder.com**
2. Paste your hosted URL → **Start**. It checks the manifest, service worker and
   icons (all already set up here).
3. **Package For Stores → Android → Generate**.
4. Download the zip. It contains:
   - `app-release-signed.apk`  ← install this on phones
   - `app-release.aab`         ← only if you later publish to Play Store
   - `assetlinks.json` + instructions
5. Put the provided `assetlinks.json` at `/.well-known/assetlinks.json` on your host
   (this removes the browser address bar in the app). PWABuilder shows the exact file.

## Step 3 — Install on an Android 13 phone
1. Copy the `.apk` to the phone (or open the download link on it).
2. Tap it → if prompted, allow **Install unknown apps** for your browser/Files app.
3. Open the app once, **Connect Google**, and you're done.
4. From WhatsApp (or anywhere): tap **Share** on an invite → choose **Invite2Cal** →
   the event is added automatically.

## Image invites (optional)
Photos/wedding cards are read with Claude vision. Set `ANTHROPIC_API_KEY` in the
host's environment to enable it. Text and PDF work without any key.

## Note on "no background"
With this hosted setup, **nothing runs on your Mac** — the host runs the service
(free tiers sleep when idle and wake on demand). The phone app just talks to it.
