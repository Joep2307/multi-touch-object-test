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

## Daarna

Niets. `git push` op je laptop is genoeg — binnen een minuut haalt de NUC de
nieuwe versie op, bouwt hem en serveert hem. Verversen in de browser volstaat.

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
iets nieuws is. Kost een `git fetch` per minuut.

## Let op

`update.sh` doet `git reset --hard origin/main`. Wat je rechtstreeks op de NUC
verandert, is bij de eerstvolgende push dus weg — met opzet: deze machine is een
kopie. Wil je daar iets uitproberen, doe het in een eigen tak of op je laptop.

## Als de tafel niet bijwerkt

Kijk eerst in `journalctl -u puck-update -n 30`. Twee dingen die eerder misgingen:

- **HTTP 401 bij `git fetch`.** Er stond een `credential.helper` van `gh` in
  `~/.gitconfig` met een verlopen token. De repo is publiek, dus ophalen kan
  anoniem: `git config --local credential.https://github.com.helper ""` in de
  kloon op de NUC zet die hulp voor deze map uit.
- **Twee bijwerkers tegelijk.** Alleen `puck-update.timer` hoort te draaien;
  controleer met `systemctl list-timers --all | grep -i puck` en
  `systemctl --user list-timers`.

Welke build er draait, zie je zonder in te loggen op `http://<tafel>:8080/version.json`.
