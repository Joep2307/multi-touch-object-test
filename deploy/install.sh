#!/usr/bin/env bash
# Zet twee systemd-diensten op deze machine:
#   puck-table.service  — serveert dist/ op poort 8080, ook na een herstart
#   puck-update.timer   — kijkt elke minuut of er een nieuwe versie op GitHub staat
#
# Dit is de enige bijwerker die er hoort te staan. Zet een eerder opgezette
# tweede uit voordat je dit draait; zie "Als de tafel niet bijwerkt" in
# deploy/README.md.
#
# Draaien met: sudo ./deploy/install.sh   (vanuit de projectmap)
set -euo pipefail

REPO=$(cd "$(dirname "$0")/.." && pwd)
USER_NAME=${SUDO_USER:-$USER}
USER_HOME=$(getent passwd "$USER_NAME" | cut -d: -f6)
PORT=${PORT:-8080}

if [ "$(id -u)" -ne 0 ]; then
  echo "draai dit met sudo: sudo ./deploy/install.sh" >&2
  exit 1
fi

# --directory in plaats van WorkingDirectory: de build vervangt dist/ door een
# nieuwe map, en een proces dat daarin stond zou daarna in een verdwenen map
# blijven hangen en niets meer vinden. Met --directory zoekt hij het pad per
# verzoek opnieuw op.
cat > /etc/systemd/system/puck-table.service <<UNIT
[Unit]
Description=Participatietafel — statische server
After=network.target

[Service]
User=$USER_NAME
WorkingDirectory=$REPO
ExecStart=/usr/bin/python3 -m http.server $PORT --bind 0.0.0.0 --directory $REPO/dist
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/puck-update.service <<UNIT
[Unit]
Description=Participatietafel — nieuwe versie ophalen en bouwen
After=network-online.target

[Service]
Type=oneshot
User=$USER_NAME
WorkingDirectory=$REPO
# Optionele instellingen (PUCK_BRANCH, PUCK_RELOAD); ontbreken mag.
EnvironmentFile=-$USER_HOME/.config/puck-table.env
ExecStart=$REPO/deploy/update.sh
# npm ci plus een build haalt de standaard van 90 s makkelijk; zonder deze
# regel schiet systemd er middenin op af en blijft er een halve build achter.
TimeoutStartSec=900
UNIT

cat > /etc/systemd/system/puck-update.timer <<UNIT
[Unit]
Description=Elke minuut kijken of er een nieuwe versie op GitHub staat

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
Unit=puck-update.service

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now puck-table.service
systemctl enable --now puck-update.timer

echo
echo "Klaar. De tafel draait op poort $PORT en werkt zichzelf elke minuut bij."
echo "  status server : systemctl status puck-table"
echo "  laatste update: journalctl -u puck-update -n 30"
