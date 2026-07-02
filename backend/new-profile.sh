#!/usr/bin/env bash
# Create a new per-person profile from the template, auto-assigning a free port,
# a unique session id, and a unique token path.
#   ./new-profile.sh papa
set -euo pipefail
cd "$(dirname "$0")"

name="${1:-}"
if [ -z "$name" ]; then echo "Usage: ./new-profile.sh <name>   (e.g. papa, mummy, bhaiya)"; exit 1; fi
# sanitize to a safe slug for session id / filenames
slug="$(echo "$name" | tr '[:upper:] ' '[:lower:]_' | tr -cd 'a-z0-9_-')"
file="profiles/$slug.env"
if [ -f "$file" ]; then echo "Profile already exists: $file"; exit 1; fi

# pick the next free port starting at 3001 (3000 is your own default).
# Ignore the template so it doesn't reserve a port.
port=3001
while :; do
  inuse=0
  for f in profiles/*.env; do
    [ "$f" = "profiles/_template.env" ] && continue
    [ -f "$f" ] || continue
    grep -qE "^PORT=$port\$" "$f" && { inuse=1; break; }
  done
  [ "$inuse" -eq 0 ] && break
  port=$((port+1))
done

sed \
  -e "s/^PROFILE_NAME=.*/PROFILE_NAME=$name/" \
  -e "s/^PORT=.*/PORT=$port/" \
  -e "s/^WHATSAPP_SESSION_ID=.*/WHATSAPP_SESSION_ID=$slug/" \
  -e "s#^GOOGLE_TOKEN_PATH=.*#GOOGLE_TOKEN_PATH=./tokens/$slug.json#" \
  profiles/_template.env > "$file"

echo "Created $file"
echo "  port        : $port"
echo "  session id  : $slug"
echo "  token       : ./tokens/$slug.json"
echo
echo "Next: edit WHATSAPP_WATCH and DEFAULT_TIMEZONE in $file, then run:  ./run.sh $slug"
