#!/usr/bin/env bash
# Kijkt of er op GitHub een nieuwere versie staat en bouwt die dan.
#
# Draait als systemd-timer op de machine die het prototype serveert. De NUC
# zit achter het netwerk, dus GitHub kan er niet bij met een webhook — vandaar
# omgekeerd: de machine vraagt het zelf, elke minuut.
set -euo pipefail
cd "$(dirname "$0")/.."

git fetch --quiet origin main
local=$(git rev-parse HEAD)
remote=$(git rev-parse origin/main)
[ "$local" = "$remote" ] && exit 0

echo "nieuwe versie: ${local:0:7} → ${remote:0:7}"

# --ff-only: liever luidruchtig falen dan stilletjes werk overschrijven dat
# iemand hier ter plekke heeft gemaakt.
git merge --ff-only --quiet origin/main

# Alleen installeren als de afhankelijkheden echt veranderd zijn; dat scheelt
# de meeste keren een halve minuut.
if ! git diff --quiet "$local" "$remote" -- package.json package-lock.json; then
  echo "afhankelijkheden gewijzigd — npm install"
  npm install --no-audit --no-fund
fi

npm run build
echo "klaar"
