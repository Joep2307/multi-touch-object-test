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

`update.sh` gebruikt `git merge --ff-only`. Bewerk je bestanden rechtstreeks op
de NUC, dan loopt de boel vast in plaats van dat je werk overschreven wordt —
dat is opzet. Los het op met `git stash` of `git reset --hard origin/main`.
