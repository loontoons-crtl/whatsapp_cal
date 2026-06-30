# Setting it up for family (on-demand, per person)

Each family member gets their **own profile** — their own WhatsApp login, Google
Calendar, watch-list and timezone. Nothing runs in the background: they open their
app when they want, fetch their group, and close it. Invites auto-create with no
clicks.

> One-time scan + connect per person. After that, every launch reconnects on its own.

---

## One-time, done once by you

The Google OAuth client (`credentials.json`) is shared by everyone — only each
person's **token** is separate. Because the consent screen is in **Testing** mode,
every family member's Gmail must be added as a **Test user** (limit 100):

1. Open <https://console.cloud.google.com/apis/credentials/consent?project=wa-calendar-501010>
2. **Test users → + ADD USERS** → add each family member's Gmail → **Save**.

---

## Add a family member (2 minutes)

```bash
./new-profile.sh papa        # creates profiles/papa.env with a free port + own session/token
```

Open `profiles/papa.env` and set just two things:

- `WHATSAPP_WATCH=` → their groups (comma-separated), e.g. `Family,Cousins`
- `DEFAULT_TIMEZONE=` → their timezone, e.g. `Asia/Kolkata`

Then start it **with them present** for the one-time linking:

```bash
./run.sh papa               # opens on the port shown (e.g. http://localhost:3001)
```

In the browser at that address:

1. **WhatsApp** — they scan the QR with **their** phone (WhatsApp → Linked Devices).
2. **Connect Google** — they sign in with **their** Gmail → *Advanced → Continue*
   (the "unverified app" warning is expected for a Testing-mode app).

Done. Their session + token are saved.

---

## Day-to-day (what each person does)

```bash
./run.sh papa
```

- It reconnects WhatsApp automatically (no re-scan).
- Open the dashboard → **Fetch from a WhatsApp group** → pick their group → invites
  auto-create on their calendar.
- Close the terminal (**Ctrl+C**) when done.

To see who's set up: `./run.sh` (lists all profiles).

---

## Notes

- **Each person on this same Mac** gets a unique port automatically. If someone runs
  it on **their own** computer instead, copy the project + `credentials.json` there,
  `PUPPETEER_SKIP_DOWNLOAD=1 npm install`, then the same `new-profile.sh` / `run.sh`.
- **Privacy:** if you host everyone here, their WhatsApp + Calendar pass through this
  machine. Running on their own computer keeps their data on their device.
- **WhatsApp risk:** this is the unofficial automation — read-only, but linking a
  number carries a small flag/ban risk. Manual mode (`WHATSAPP_MODE=manual` in their
  profile) avoids it: they paste invite text instead of linking WhatsApp.
- Profiles never contain secrets, but they're gitignored anyway (except the template).
