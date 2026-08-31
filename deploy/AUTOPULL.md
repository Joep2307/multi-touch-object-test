# De tafel haalt zichzelf bij

Doel: jij pusht op de Mac, en binnen een minuut draait de tafel de nieuwe
build. Geen SSH, geen handmatige stappen. SSH blijft er voor als er iets
misgaat, niet voor de dagelijkse gang.

## Eenmalig op de tafel

Uitgangspunt: de kloon staat in `~/puck-table`, de tafel volgt `main`, en er is
al iets dat `dist/` serveert en een browser in kiosk zet (zie `install.sh`).

1. **Leesrechten zonder wachtwoord.** Publieke repo over https: niets te doen.
   Privé: maak op de tafel een sleutel (`ssh-keygen -t ed25519 -C tafel`) en zet
   de publieke helft in GitHub als *deploy key* (alleen lezen), en zet de remote
   op de ssh-vorm: `git remote set-url origin git@github.com:<jij>/<repo>.git`.

2. **Instellingen** in `~/.config/puck-table.env` (alleen als de standaard niet
   klopt):

   ```sh
   PUCK_REPO=/home/tafel/puck-table
   PUCK_BRANCH=main
   PUCK_RELOAD=systemctl --user restart puck-kiosk.service
   ```

   `PUCK_RELOAD` is het commando dat de browser herstart nadat de build klaar
   is. Heet die service anders, zet hier de juiste naam. Wil je dat de tafel
   nooit vanzelf herlaadt: `PUCK_RELOAD=`.

3. **Aanzetten:**

   ```sh
   mkdir -p ~/.config/systemd/user
   ln -sf ~/puck-table/deploy/puck-autopull.service ~/.config/systemd/user/
   ln -sf ~/puck-table/deploy/puck-autopull.timer   ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now puck-autopull.timer
   loginctl enable-linger $USER     # draait ook door zonder ingelogde sessie
   ```

Klaar. Vanaf nu: `git push` op de Mac is de hele handeling.

## Meekijken

```sh
systemctl --user list-timers puck-autopull.timer   # wanneer de volgende ronde is
journalctl --user -u puck-autopull -f              # wat hij deed
systemctl --user start puck-autopull.service       # nu meteen, niet wachten
```

Op de tafel zelf zie je het aan het bijgewerkt-stempel onder de puckbalk; in
`dist/version.json` staan commit en bouwtijd.

## Waarom zo

- **Trekken, niet duwen.** De tafel hoeft niet bereikbaar te zijn en jij hoeft
  zijn adres niet te weten. Wisselend wifi, ander netwerk, herstart: maakt niet
  uit, hij komt vanzelf weer langs.
- **Een minuut is goedkoop.** Zonder nieuwe commits is een ronde één `git
  fetch`; bouwen gebeurt alleen als de commit echt anders is.
- **`npm ci` alleen bij een nieuwe `package-lock.json`.** Dat scheelt de minuut
  die een volledige install kost.
- **`git reset --hard`.** De tafel is een kopie. Wat daar per ongeluk lokaal is
  veranderd, verdwijnt — anders loopt de pull ooit vast op een conflict terwijl
  er publiek omheen staat.
