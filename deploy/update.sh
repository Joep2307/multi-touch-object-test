#!/usr/bin/env bash
# Kijkt of er op GitHub een nieuwere versie staat en bouwt die dan.
#
# Draait als systemd-timer op de machine die het prototype serveert. De NUC
# zit achter het netwerk, dus GitHub kan er niet bij met een webhook — vandaar
# omgekeerd: de machine vraagt het zelf, elke minuut.
set -euo pipefail
cd "$(dirname "$0")/.."

# Nooit blijven hangen op een inlogvraag: de repo is publiek, ophalen kan
# anoniem. Een verlopen token van `gh` leverde eerder om de minuut een 401 op.
export GIT_TERMINAL_PROMPT=0

git fetch --quiet origin main
local=$(git rev-parse HEAD)
remote=$(git rev-parse origin/main)
[ "$local" = "$remote" ] && exit 0

echo "nieuwe versie: ${local:0:7} → ${remote:0:7}"

# Harde reset in plaats van --ff-only: deze machine is een kopie, geen
# werkplek. Eén per ongeluk gewijzigd bestand (npm dat package-lock.json
# aanraakt, bijvoorbeeld) zou een ff-only merge voorgoed laten stranden, en
# dan blijft de tafel stilletjes op een oude versie staan.
git reset --hard --quiet "$remote"

# Alleen installeren als de afhankelijkheden echt veranderd zijn; dat scheelt
# de meeste keren een halve minuut.
if ! git diff --quiet "$local" "$remote" -- package.json package-lock.json || [ ! -d node_modules ]; then
  echo "afhankelijkheden gewijzigd — npm ci"
  npm ci --no-audit --no-fund
fi

npm run build

# Zo kun je van buitenaf zien welke build er staat: curl http://<tafel>:8080/version.json
printf '{"commit":"%s","gebouwd":"%s"}\n' \
  "$(git rev-parse --short HEAD)" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > dist/version.json

echo "klaar op $(git rev-parse --short HEAD)"
