#!/usr/bin/env bash
# Haalt nieuwe commits op en bouwt ze op de tafel. Draait elke minuut via
# puck-autopull.timer; doet niets als er niets veranderd is.
#
# Draait vanaf ~/.local/bin/puck-autopull.sh (een kopie), niet vanuit de repo:
# anders zou een pull het script onder zijn eigen voeten vandaan schrijven.
# Aan het eind werkt hij die kopie bij als deze versie nieuwer is.
#
# Instellingen in ~/.config/puck-table.env:
#   PUCK_REPO    map van de kloon        (standaard ~/multi-touch-object-test)
#   PUCK_BRANCH  tak die de tafel volgt  (standaard main)
#   PUCK_RELOAD  commando na de build    (leeg: de statische server leest
#                dist/ bij elk verzoek, dus er hoeft niets herstart te worden)
set -euo pipefail

REPO="${PUCK_REPO:-$HOME/multi-touch-object-test}"
BRANCH="${PUCK_BRANCH:-main}"
RELOAD="${PUCK_RELOAD:-}"

export GIT_TERMINAL_PROMPT=0   # nooit stilletjes op een inlogvraag blijven hangen

cd "$REPO"

git fetch --quiet origin "$BRANCH"
have="$(git rev-parse HEAD)"
want="$(git rev-parse "origin/$BRANCH")"
if [ "$have" = "$want" ]; then
  exit 0            # niets nieuws: klaar in een halve seconde
fi

echo "nieuwe versie: ${have:0:7} -> ${want:0:7}"

lock_voor="$(git rev-parse HEAD:package-lock.json 2>/dev/null || echo geen)"
# De tafel is een kopie, geen werkplek: lokale wijzigingen gaan overboord.
git reset --hard --quiet "$want"
lock_na="$(git rev-parse HEAD:package-lock.json 2>/dev/null || echo geen)"
if [ "$lock_voor" != "$lock_na" ] || [ ! -d node_modules ]; then
  echo "afhankelijkheden bijwerken: npm ci"
  npm ci --no-audit --no-fund
fi

npm run build

printf '{"commit":"%s","gebouwd":"%s"}\n' \
  "$(git rev-parse --short HEAD)" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > dist/version.json

if [ -n "$RELOAD" ]; then
  echo "herstarten: $RELOAD"
  $RELOAD
fi

# Zichzelf bijwerken: schrijven naar een nieuw bestand en hernoemen, zodat de
# kopie die nu draait ongemoeid blijft.
zelf="$HOME/.local/bin/puck-autopull.sh"
if [ -f deploy/autopull.sh ] && [ -e "$zelf" ] && ! cmp -s deploy/autopull.sh "$zelf"; then
  cp deploy/autopull.sh "$zelf.nieuw" && chmod +x "$zelf.nieuw" && mv -f "$zelf.nieuw" "$zelf"
  echo "script zelf bijgewerkt"
fi

echo "klaar op $(git rev-parse --short HEAD)"
