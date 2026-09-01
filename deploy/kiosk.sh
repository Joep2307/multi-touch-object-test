#!/usr/bin/env bash
# Het gebaar dat de tafel wegschuift komt niet uit de pagina.
#
# Drie vingers op een touchscreen is voor de bureaubladomgeving een gebaar —
# GNOME schuift er een werkblad mee weg of trekt het overzicht open — en die
# vangt het af vóór de browser hem ooit ziet. Geen enkele regel JavaScript kan
# daar iets aan doen: het gebaar bereikt de pagina niet. En drie vingers is nou
# net wat een puck is.
#
# Dit script kijkt wat er draait en zet het uit, van zacht naar hard:
#
#   ./deploy/kiosk.sh              wat draait hier eigenlijk
#   sudo ./deploy/kiosk.sh zacht   gebaren uitzetten, bureaublad blijft
#   sudo ./deploy/kiosk.sh kiosk   geen bureaublad meer, alleen de tafel
#   sudo ./deploy/kiosk.sh terug   de kiosk er weer af
#
set -euo pipefail

PORT=${PORT:-8080}
USER_NAME=${SUDO_USER:-$USER}
USER_UID=$(id -u "$USER_NAME")
# gsettings hoort bij de sessie van de gebruiker, niet bij root.
als_gebruiker(){ sudo -u "$USER_NAME" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$USER_UID/bus" "$@"; }
heeft(){ command -v "$1" >/dev/null 2>&1; }
root_nodig(){ [ "$(id -u)" -eq 0 ] || { echo "draai dit met sudo: sudo ./deploy/kiosk.sh $1" >&2; exit 1; }; }

# Een echte deb gaat voor op de snap. De snap-chromium zit in een profiel dat
# verborgen mappen in de home niet mag schrijven, en hij wisselt van versie
# wanneer snapd daar zin in heeft — allebei niet wat je op een tentoonstelling
# wilt. Vandaar deze volgorde, en de waarschuwing hieronder.
vind_browser(){
  for b in google-chrome-stable google-chrome chromium-browser chromium; do
    heeft "$b" && { command -v "$b"; return 0; }
  done
  return 1
}

kijk(){
  echo "sessie      : ${XDG_SESSION_TYPE:-onbekend}   (wayland = gebaren zitten in de compositor, x11 = meestal geen touchgebaren)"
  echo "bureaublad  : ${XDG_CURRENT_DESKTOP:-onbekend}"
  echo "browser     : $(vind_browser || echo 'geen chromium/chrome gevonden')"
  echo "cage        : $(heeft cage && command -v cage || echo 'niet geïnstalleerd')"
  if heeft gsettings; then
    echo "werkbladen  : $(gsettings get org.gnome.desktop.wm.preferences num-workspaces 2>/dev/null || echo n.v.t.)" \
         "(dynamisch: $(gsettings get org.gnome.mutter dynamic-workspaces 2>/dev/null || echo n.v.t.))"
  fi
  echo "kiosk       : $(systemctl is-enabled puck-kiosk.service 2>/dev/null || echo 'niet geïnstalleerd')"
  echo
  echo "Zit je op Wayland? Uitloggen en bij het aanmeldscherm 'op Xorg' kiezen is"
  echo "de goedkoopste test: onder X11 doet GNOME geen drievingergebaren op een"
  echo "touchscreen. Helpt dat, dan ben je klaar."
}

zacht(){
  root_nodig zacht
  case "${XDG_CURRENT_DESKTOP:-}" in
    *GNOME*|"")
      # Eén werkblad: een veeg opzij heeft dan nergens heen te schuiven. De
      # veeg omhoog naar het overzicht blijft bestaan — die zit vast in mutter
      # en is alleen met een extensie of met een kiosk weg te krijgen.
      als_gebruiker gsettings set org.gnome.mutter dynamic-workspaces false || true
      als_gebruiker gsettings set org.gnome.desktop.wm.preferences num-workspaces 1 || true
      als_gebruiker gsettings set org.gnome.desktop.interface enable-hot-corners false || true
      echo "GNOME: één werkblad, hoeken uit. Een veeg opzij kan nu nergens meer heen."
      echo "De veeg omhoog naar het overzicht blijft; daarvoor is 'kiosk' nodig."
      ;;
  esac
  for kw in kwriteconfig6 kwriteconfig5; do
    heeft "$kw" || continue
    for rand in Top Bottom Left Right; do
      als_gebruiker "$kw" --file kwinrc --group TouchEdges --key "$rand" None || true
    done
    als_gebruiker qdbus org.kde.KWin /KWin reconfigure 2>/dev/null || true
    echo "KDE: schermrandgebaren uit."
    break
  done
}

kiosk(){
  root_nodig kiosk
  local browser; browser=$(vind_browser) || { echo "geen chromium gevonden — installeer die eerst: sudo apt install chromium" >&2; exit 1; }
  case "$browser" in
    /snap/*)
      echo "Let op: dit is de snap-versie ($browser)."
      echo "Die mag geen verborgen mappen in je home schrijven, dus het profiel"
      echo "staat hieronder bewust op ~/puck-kiosk-profiel en niet in ~/.config."
      echo "Een echte deb (google-chrome-stable) is voor een kiosk rustiger."
      ;;
  esac
  heeft cage || { echo "cage installeren…"; apt-get update -qq && apt-get install -y cage; }

  # cage is een compositor die precies één venster kent. Geen werkbladen, geen
  # overzicht, geen gebaren — er is niets om heen te vegen. De tafel is dan een
  # apparaat en geen computer met een programma erop.
  cat > /etc/systemd/system/puck-kiosk.service <<UNIT
[Unit]
Description=Participatietafel — kiosk, alleen de tafel
After=systemd-user-sessions.service puck-table.service
Wants=puck-table.service

[Service]
User=$USER_NAME
PAMName=login
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
StandardInput=tty-fail
StandardOutput=journal
StandardError=journal
Environment=XDG_RUNTIME_DIR=/run/user/$USER_UID
# -s laat Ctrl+Alt+F2 werken, zodat je er altijd nog uit kunt.
ExecStart=/usr/bin/cage -s -- $browser \\
  --ozone-platform=wayland --kiosk --app=http://localhost:$PORT \\
  --touch-events=enabled --disable-pinch --overscroll-history-navigation=0 \\
  --noerrdialogs --disable-infobars --no-first-run --disable-session-crashed-bubble \\
  --user-data-dir=/home/$USER_NAME/puck-kiosk-profiel
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

  systemctl daemon-reload
  # Het bureaublad hoort niet meer op te starten; anders vechten GDM en de
  # kiosk om hetzelfde scherm.
  systemctl disable gdm gdm3 sddm lightdm 2>/dev/null || true
  systemctl set-default multi-user.target
  systemctl enable puck-kiosk.service
  echo
  echo "Klaar. Herstart de NUC: hij komt op in de tafel, zonder bureaublad."
  echo "  eruit          : Ctrl+Alt+F2 geeft een console"
  echo "  terugdraaien   : sudo ./deploy/kiosk.sh terug"
}

terug(){
  root_nodig terug
  systemctl disable --now puck-kiosk.service 2>/dev/null || true
  rm -f /etc/systemd/system/puck-kiosk.service
  systemctl daemon-reload
  for dm in gdm gdm3 sddm lightdm; do systemctl list-unit-files "$dm.service" >/dev/null 2>&1 && systemctl enable "$dm" 2>/dev/null || true; done
  systemctl set-default graphical.target
  echo "Kiosk eraf. Herstart en het bureaublad is terug."
}

case "${1:-kijk}" in
  kijk)  kijk ;;
  zacht) zacht ;;
  kiosk) kiosk ;;
  terug) terug ;;
  *) echo "gebruik: ./deploy/kiosk.sh [kijk|zacht|kiosk|terug]" >&2; exit 1 ;;
esac
