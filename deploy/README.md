# deploy/

Voor de machine die het prototype serveert (de NUC), niet voor je laptop.

## Eenmalig

```sh
git clone https://github.com/Joep2307/multi-touch-object-test.git
cd multi-touch-object-test
npm install
npm run build
sudo ./deploy/install.sh
```

Een andere poort dan 8080: `sudo PORT=9000 ./deploy/install.sh`.

Optioneel, in `~/.config/puck-table.env` — alleen als de standaard niet klopt:

```sh
PUCK_BRANCH=main
PUCK_RELOAD=systemctl --user restart puck-kiosk.service
```

`PUCK_RELOAD` draait na een gelukte build, bijvoorbeeld om de browser te
herstarten. Leeg laten mag: de server leest `dist/` bij elk verzoek, dus
verversen in de browser is genoeg.

## Daarna

Niets. `git push` op je laptop is genoeg — binnen een minuut haalt de NUC de
nieuwe versie op, bouwt hem en serveert hem.

## Meekijken

```sh
systemctl status puck-table          # draait de server?
journalctl -u puck-update -f         # wat doet de bijwerker?
systemctl list-timers puck-update    # wanneer de volgende ronde is
```

## Handmatig, zonder te wachten

```sh
sudo systemctl start puck-update
```

## Waarom een timer en geen webhook

De NUC staat achter het netwerk en is van buitenaf niet bereikbaar, dus GitHub
kan er niets naartoe sturen. Omgekeerd werkt wel: de machine vraagt zelf of er
iets nieuws is. Kost een `git fetch` per minuut; bouwen gebeurt alleen als er
echt een andere commit staat.

## Wat er gebeurt als een build mislukt

`update.sh` bouwt naar `dist.nieuw/` en wisselt die map pas om als de build
klaar is. Gaat er onderweg iets mis — netwerk weg tijdens `npm ci`, een fout in
de code — dan blijft `dist/` staan zoals hij stond en serveert de tafel gewoon
de vorige versie door.

Of er iets nieuws te doen is, leest hij af aan `dist/version.json`, niet aan
`HEAD`: `HEAD` is al verzet voordat de build begint, dus daarmee zou een
mislukte poging nooit herhaald worden. Nu probeert hij het de volgende minuut
opnieuw — vijf keer, daarna wacht hij op een nieuwe push. In `journalctl -u
puck-update` staat welke poging het was.

## Let op

`update.sh` doet `git reset --hard origin/main`. Wat je rechtstreeks op de NUC
verandert, is bij de eerstvolgende push dus weg — met opzet: deze machine is een
kopie. Wil je daar iets uitproberen, doe het in een eigen tak of op je laptop.

## Als de tafel niet bijwerkt

Kijk eerst in `journalctl -u puck-update -n 30`. Drie dingen die eerder misgingen:

- **HTTP 401 bij `git fetch`.** Er stond een `credential.helper` van `gh` in
  `~/.gitconfig` met een verlopen token. De repo is publiek, dus ophalen kan
  anoniem: `git config --local credential.https://github.com.helper ""` in de
  kloon op de NUC zet die hulp voor deze map uit.
- **Twee bijwerkers tegelijk.** Alleen `puck-update.timer` hoort te draaien.
  Er is een tijd lang ook een `puck-autopull.timer` als *user*-unit beschreven;
  die is uit de repo, maar op een machine waar hij ooit is aangezet blijft hij
  staan. Controleren en uitzetten:

  ```sh
  systemctl list-timers --all | grep -i puck    # systeemunits
  systemctl --user list-timers | grep -i puck   # user-units
  systemctl --user disable --now puck-autopull.timer
  rm -f ~/.config/systemd/user/puck-autopull.{service,timer} ~/.local/bin/puck-autopull.sh
  systemctl --user daemon-reload
  ```

- **De build werd afgekapt.** `puck-update.service` heeft `TimeoutStartSec=900`;
  zonder die regel schiet systemd na 90 seconden af op een `npm ci` die nog
  bezig is. Draait er een oudere unit, dan zet `sudo ./deploy/install.sh` hem
  opnieuw goed.

Welke build er draait, zie je zonder in te loggen op `http://<tafel>:8080/version.json`.

Het gesprek uitschrijven (de knop **Gesprek opnemen** in het venster) staat in
[TRANSCRIPTIE.md](TRANSCRIPTIE.md): wat de uitschrijfdienst op `api/transcribe`
moet kunnen, en waarom de kiosk chromium met `--use-fake-ui-for-media-stream`
start.
