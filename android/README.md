# Android app (Invite → Calendar)

A small native Android app (min **Android 13**, target Android 14) that pairs with the
local server in this project. It does two things:

1. **Dashboard** — opens the server's web dashboard in a WebView.
2. **Share target** — when you tap **Share** on a WhatsApp invite (or any text) and pick
   **Invite → Calendar**, the text is sent to the server's `/api/share` endpoint, which
   parses it and returns a Google Calendar link the app opens for you.

The app is a thin shell: all the parsing/calendar logic stays on the server, so the
multilingual detection and confirm-before-create behavior are identical to the web app.

---

## Getting the APK

You can't build an Android APK without the Android SDK + a JDK, so pick one of these.

### Option A — Build in the cloud with GitHub Actions (no local Android tools) ✅ recommended

1. Put this project in a GitHub repository (private is fine):
   ```bash
   cd ~/Claude/Projects/tanmay
   git init && git add . && git commit -m "WhatsApp → Calendar"
   # create an empty repo on github.com, then:
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. On GitHub, open the **Actions** tab. The **Build Android APK** workflow runs
   automatically on push (or click **Run workflow**).
3. When it finishes (~3–5 min), open the run and download the
   **InviteCal-debug-apk** artifact. Inside is `app-debug.apk`.
4. Copy it to your phone and install (see *Installing* below).

The workflow is at `.github/workflows/android-build.yml`.

### Option B — Build locally with Android Studio

1. Install [Android Studio](https://developer.android.com/studio).
2. **Open** the `android/` folder (not the repo root). Let Gradle sync.
3. **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. The APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`.

### Option C — Command line (if you have the Android SDK + JDK 17)

```bash
cd android
gradle wrapper --gradle-version 8.7   # first time only
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

---

## Installing on your phone (Android 13+)

The APK is **debug-signed** (fine for personal use, not for the Play Store).

1. Transfer `app-debug.apk` to the phone (USB, Drive, email to yourself, etc.).
2. Open it with the Files app. Android will ask to allow installing from this source —
   approve it (Settings → *Install unknown apps* for that app).
3. Install. You'll see **Invite → Calendar** in your launcher and in the Share sheet.

---

## Connecting the app to your computer

The server runs on your computer; the phone talks to it over **the same Wi-Fi**.

1. Start the server on your Mac: `npm start` (note the port, default 3000).
2. Find your Mac's local IP: **System Settings → Wi-Fi → Details → IP address**
   (looks like `192.168.1.10`).
3. First time you open the app (or share to it), enter:
   `http://192.168.1.10:3000` — your IP and port. Change it anytime from the
   in-app menu (**Set server URL**).

> The app allows plain HTTP because LAN addresses aren't HTTPS
> (`network_security_config.xml`). Keep this for home/office Wi-Fi use.

### Using it
- **Open the app** → see the dashboard, review/confirm invites.
- **Share a WhatsApp message** → WhatsApp → ⋮ → Share → **Invite → Calendar**.
  The app sends it to the server and opens the resulting calendar event/link.

---

## Project facts
- `applicationId` / namespace: `com.sequencesurface.invitecal`
- minSdk 33 (Android 13), targetSdk 34, compileSdk 34
- Kotlin 1.9.24, Android Gradle Plugin 8.5.2, Gradle 8.7
- Dependencies: `androidx.core:core-ktx`, `androidx.appcompat`
- No third-party SDKs, no analytics, no extra permissions beyond INTERNET.
