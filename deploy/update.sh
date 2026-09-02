#!/usr/bin/env bash
# Kijkt of er op GitHub een nieuwere versie staat en bouwt die dan.
#
# Draait als systemd-timer (puck-update.timer) op de machine die het prototype
# serveert. De NUC zit achter het netwerk, dus GitHub kan er niet bij met een
# webhook — vandaar omgekeerd: de machine vraagt het zelf, elke minuut.
#
# Dit is de enige bijwerker. Draait er een tweede timer mee, dan doen twee
# builds tegelijk hetzelfde en kan de tafel midden in een omwisseling staan;
# zie "Als de tafel niet bijwerkt" in README.md.
#
# Instellingen in ~/.config/puck-table.env, alleen als de standaard niet klopt:
#   PUCK_BRANCH  tak die de tafel volgt          (standaard main)
#   PUCK_RELOAD  commando na een gelukte build   (leeg: niets — de server leest
#                dist/ per verzoek, dus herstarten hoeft niet)
set -euo pipefail

# Een `git reset --hard` verderop schrijft dit bestand opnieuw, terwijl bash het
# nog regel voor regel aan het lezen is. Daarom loopt de rest uit een kopie in
# /tmp: die verandert niet meer, wat de reset ook doet.
if [ "${PUCK_KOPIE:-}" != "1" ]; then
  bron="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
  kopie="$(mktemp /tmp/puck-update.XXXXXX)"
  cat "$bron" > "$kopie"
  PUCK_KOPIE=1 PUCK_BRON="$bron" exec bash "$kopie"
fi
rm -f "$0"   # de kopie; Linux houdt hem open zolang bash eruit leest
cd "$(dirname "$PUCK_BRON")/.."

# Nooit blijven hangen op een inlogvraag: de repo is publiek, ophalen kan
# anoniem. Een verlopen token van `gh` leverde eerder om de minuut een 401 op.
export GIT_TERMINAL_PROMPT=0

BRANCH="${PUCK_BRANCH:-main}"
RELOAD="${PUCK_RELOAD:-}"
STAAT=".puck-update-staat"   # niet in git, dus een reset --hard laat hem staan

git fetch --quiet origin "$BRANCH"
doel=$(git rev-parse "origin/$BRANCH")

# De maatstaf is wat er in dist/ staat, niet HEAD. HEAD is namelijk al verzet
# voordat de build begint: mislukte die build, dan zou een vergelijking met HEAD
# hem nooit opnieuw proberen en bleef de tafel tot de volgende push kapot.
draait=$(sed -n 's/.*"commit":"\([0-9a-f]*\)".*/\1/p' dist/version.json 2>/dev/null || true)
if [ -n "$draait" ] && [ "${doel:0:${#draait}}" = "$draait" ]; then
  exit 0            # niets nieuws: klaar in een halve seconde
fi

# Een commit die niet wil bouwen, blijven we niet eindeloos proberen — dat kost
# de tafel elke minuut een hele npm ci. Na vijf pogingen wachten we op een
# nieuwe push; die heeft een andere hash en begint dus weer bij één.
mislukt_commit=""; mislukt_aantal=0
if [ -f "$STAAT" ]; then read -r mislukt_commit mislukt_aantal < "$STAAT" || true; fi
if [ "$mislukt_commit" = "$doel" ] && [ "${mislukt_aantal:-0}" -ge 5 ]; then
  echo "commit ${doel:0:7} mislukte al $mislukt_aantal keer — wachten op een nieuwe push" >&2
  exit 0
fi

echo "nieuwe versie: ${draait:-onbekend} → ${doel:0:7}"

gelukt=0
afronden(){
  rm -rf dist.nieuw
  if [ "$gelukt" != 1 ]; then
    poging=1
    if [ "$mislukt_commit" = "$doel" ]; then poging=$((mislukt_aantal + 1)); fi
    printf '%s %s\n' "$doel" "$poging" > "$STAAT"
    echo "bouwen van ${doel:0:7} mislukt (poging $poging) — dist/ blijft op ${draait:-de vorige build}" >&2
  fi
}
trap afronden EXIT

voor=$(git rev-parse HEAD)

# Harde reset in plaats van --ff-only: deze machine is een kopie, geen
# werkplek. Eén per ongeluk gewijzigd bestand (npm dat package-lock.json
# aanraakt, bijvoorbeeld) zou een ff-only merge voorgoed laten stranden, en
# dan blijft de tafel stilletjes op een oude versie staan.
git reset --hard --quiet "$doel"

# Alleen installeren als de afhankelijkheden echt veranderd zijn; dat scheelt
# de meeste keren een halve minuut.
if ! git diff --quiet "$voor" "$doel" -- package.json package-lock.json || [ ! -d node_modules ]; then
  echo "afhankelijkheden gewijzigd — npm ci"
  npm ci --no-audit --no-fund
fi

# Naar een aparte map bouwen en pas bij succes omwisselen. Vite maakt zijn
# doelmap eerst leeg: bouwde hij rechtstreeks in dist/, dan stond de tafel bij
# de eerste de beste fout op zwart, met publiek eromheen.
rm -rf dist.nieuw
npm run build -- --outDir dist.nieuw

# Zo kun je van buitenaf zien welke build er staat: curl http://<tafel>:8080/version.json
printf '{"commit":"%s","gebouwd":"%s"}\n' \
  "$(git rev-parse --short HEAD)" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > dist.nieuw/version.json

rm -rf dist.oud
if [ -d dist ]; then mv dist dist.oud; fi
mv dist.nieuw dist
rm -rf dist.oud

gelukt=1
rm -f "$STAAT"

if [ -n "$RELOAD" ]; then
  echo "herstarten: $RELOAD"
  $RELOAD || echo "het herstartcommando gaf een fout; de nieuwe build staat er wel" >&2
fi

echo "klaar op $(git rev-parse --short HEAD)"
