#!/usr/bin/env bash
# Launch a per-person profile.
#   ./run.sh papa      -> runs profiles/papa.env
#   ./run.sh           -> lists available profiles
set -euo pipefail
cd "$(dirname "$0")"

if [ $# -eq 0 ]; then
  echo "Usage: ./run.sh <profile>"
  echo "Available profiles:"
  ls profiles/*.env 2>/dev/null | grep -v '_template.env' | sed 's#profiles/#  - #; s#\.env##' || echo "  (none yet — create one with ./new-profile.sh <name>)"
  exit 1
fi

name="$1"
file="profiles/$name.env"
if [ ! -f "$file" ]; then
  echo "No profile '$name' (looked for $file)."
  echo "Create it with:  ./new-profile.sh $name"
  exit 1
fi

port="$(grep -E '^PORT=' "$file" | head -1 | cut -d= -f2)"
echo "Starting profile '$name' on http://localhost:${port:-3000}  (Ctrl+C to stop)"
DOTENV_CONFIG_PATH="$file" node src/index.js
