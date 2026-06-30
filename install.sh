#!/usr/bin/env bash
# One-command installer for WhatsApp → Google Calendar.
# - Ensures Node.js (>=18) is available, installing it via nvm if needed
# - Installs npm dependencies
# - Creates .env from the template
#
# Usage:  ./install.sh
set -euo pipefail

cyan()  { printf "\033[36m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }

cd "$(dirname "$0")"
cyan "==> WhatsApp → Google Calendar installer"

NEED_NODE=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [ "${NODE_MAJOR:-0}" -lt 18 ]; then
    yellow "Found Node $(node -v) — too old (need >=18)."
    NEED_NODE=1
  else
    green "Found Node $(node -v) ✓"
  fi
else
  yellow "Node.js not found."
  NEED_NODE=1
fi

if [ "$NEED_NODE" -eq 1 ]; then
  cyan "==> Installing Node.js LTS via nvm…"
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  fi
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm install --lts
  nvm use --lts
  green "Installed Node $(node -v) ✓"
fi

cyan "==> Installing dependencies (npm install)…"
if [ "${SKIP_PUPPETEER:-0}" = "1" ]; then
  yellow "SKIP_PUPPETEER=1 set — skipping Chromium download (manual mode only)."
  export PUPPETEER_SKIP_DOWNLOAD=1
fi

if ! npm install; then
  yellow "npm install failed. Most common cause: a corrupted Puppeteer browser cache"
  yellow "(folder exists but the Chrome executable is missing)."
  cyan "==> Clearing ~/.cache/puppeteer and retrying once…"
  rm -rf "$HOME/.cache/puppeteer"
  if ! npm install; then
    yellow "Still failing. Retrying WITHOUT the Chromium download."
    yellow "Manual paste mode will work immediately. For live WhatsApp mode, either"
    yellow "re-run install later or point PUPPETEER_EXECUTABLE_PATH at an installed Chrome"
    yellow "(see .env.example)."
    PUPPETEER_SKIP_DOWNLOAD=1 npm install
  fi
fi

if [ ! -f .env ]; then
  cp .env.example .env
  green "Created .env from template ✓"
  yellow "   → Edit .env to set DEFAULT_TIMEZONE, WHATSAPP_WATCH, etc."
else
  green ".env already exists — leaving it untouched ✓"
fi

echo
green "✅ Install complete."
echo
cyan "Next steps:"
echo "  1. Add Google credentials.json (see SETUP.md → step 4)"
echo "  2. Authorize Google:   npm run auth"
echo "  3. Start the app:      npm start   → http://localhost:3000"
echo
echo "No setup needed to try parsing:   npm run test:parse"
