#!/usr/bin/env bash
# Fix "The browser is already running for .../.wwebjs_auth/session".
# Kills orphaned Chrome processes holding the WhatsApp session and clears stale locks.
# Run this if the QR never appears after a crash or force-quit, then start the app again.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Stopping orphaned WhatsApp Chrome processes…"
if pgrep -f ".wwebjs_auth" >/dev/null 2>&1; then
  pkill -9 -f ".wwebjs_auth" 2>/dev/null || true
  sleep 1
  echo "    killed."
else
  echo "    none running."
fi

echo "==> Clearing stale Chrome singleton locks…"
rm -f .wwebjs_auth/session*/Singleton* 2>/dev/null || true
echo "    done."

echo
echo "✅ WhatsApp session unlocked. Start the app again:  npm start"
