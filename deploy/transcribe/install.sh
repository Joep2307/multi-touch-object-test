#!/usr/bin/env bash
# Zet de uitschrijver van de tafel neer als dienst:
#   puck-stt.service — luistert op poort 8770 en schrijft blokjes audio uit
#
# Draaien met: sudo ./deploy/transcribe/install.sh   (vanuit de projectmap)
#
# De venv staat bewust BUITEN de repo. De tafel haalt zichzelf elke minuut bij
# (deploy/update.sh doet een reset --hard en een npm ci); een halve gigabyte
# python in de projectmap zou daar elke keer overheen struikelen of in de
# .gitignore verdwalen. In ~/.local/share/puck-stt staat hij ernaast en blijft
# hij staan.
set -euo pipefail

REPO=$(cd "$(dirname "$0")/../.." && pwd)
USER_NAME=${SUDO_USER:-$USER}
USER_HOME=$(getent passwd "$USER_NAME" | cut -d: -f6)
VENV=${PUCK_STT_VENV:-$USER_HOME/.local/share/puck-stt/venv}
PORT=${PUCK_STT_PORT:-8770}
MODEL=${PUCK_STT_MODEL:-small}
BIND=${PUCK_STT_BIND:-0.0.0.0}

if [ "$(id -u)" -ne 0 ]; then
  echo "draai dit met sudo: sudo ./deploy/transcribe/install.sh" >&2
  exit 1
fi

command -v python3 >/dev/null || { echo "python3 ontbreekt: sudo apt install python3 python3-venv" >&2; exit 1; }

echo "venv in $VENV"
sudo -u "$USER_NAME" mkdir -p "$(dirname "$VENV")"
if [ ! -x "$VENV/bin/python" ]; then
  sudo -u "$USER_NAME" python3 -m venv "$VENV" \
    || { echo "venv maken mislukte — ontbreekt python3-venv? sudo apt install python3-venv" >&2; exit 1; }
fi
sudo -u "$USER_NAME" "$VENV/bin/pip" install --upgrade pip >/dev/null
sudo -u "$USER_NAME" "$VENV/bin/pip" install -r "$REPO/deploy/transcribe/requirements.txt"

# Het model nú ophalen, niet bij het eerste gesprek. Anders staat de eerste
# groep bezoekers een halve gigabyte te wachten terwijl ze denken dat het stuk
# is. Draait de machine offline, dan faalt dit — vandaar geen set -e hier, met
# een duidelijke melding in plaats van een halve installatie.
echo "model $MODEL ophalen (kan even duren)…"
if sudo -u "$USER_NAME" env PUCK_STT_MODEL="$MODEL" "$VENV/bin/python" - <<'PY'
import os
from faster_whisper import WhisperModel
WhisperModel(os.environ.get("PUCK_STT_MODEL", "small"), device="cpu", compute_type="int8")
print("model staat klaar")
PY
then :; else
  echo
  echo "LET OP: het model kon niet opgehaald worden (geen internet?)."
  echo "De dienst wordt wel geïnstalleerd; hij haalt het model op zodra hij er"
  echo "wél bij kan. Tot die tijd valt de tafel terug op alleen opnemen."
fi

cat > /etc/systemd/system/puck-stt.service <<UNIT
[Unit]
Description=Participatietafel — het gesprek uitschrijven
After=network.target

[Service]
User=$USER_NAME
WorkingDirectory=$REPO
# Dezelfde optionele instellingen als de rest van de tafel; ontbreken mag.
EnvironmentFile=-$USER_HOME/.config/puck-table.env
Environment=PUCK_STT_PORT=$PORT
Environment=PUCK_STT_MODEL=$MODEL
Environment=PUCK_STT_BIND=$BIND
Environment=HOME=$USER_HOME
ExecStart=$VENV/bin/python $REPO/deploy/transcribe/transcribe.py
Restart=always
RestartSec=3
# Het model laden duurt op een NUC tientallen seconden; systemd hoeft daar niet
# ongeduldig van te worden.
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now puck-stt.service

echo
echo "Klaar. De uitschrijver luistert op poort $PORT met model $MODEL."
echo "  status  : systemctl status puck-stt"
echo "  meekijken: journalctl -u puck-stt -f"
echo "  proberen : curl http://localhost:$PORT/api/transcribe"
echo
echo "De tafel vindt hem vanzelf: staat er geen adres ingesteld, dan kijkt de"
echo "pagina naar dezelfde machine op poort $PORT. Draait hij ergens anders,"
echo "open de tafel dan met ?stt=http://<machine>:$PORT"
