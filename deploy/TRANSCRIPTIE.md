# Het gesprek uitschrijven

De tafel heeft sinds vandaag een knop **Gesprek opnemen** in het venster dat bij
een markering hoort: eerst een plek en een thema, dan praten, en de tekst loopt
mee. Wie dat werk doet staat niet vast — `speech.js` kiest zelf, in deze
volgorde:

1. **Een uitschrijfdienst op de tafel zelf** (`api/transcribe`). Dit is de
   bedoeling. Alles blijft op de NUC.
2. **De spraakherkenning van de browser.** Werkt zonder installatie, maar Chrome
   stuurt de audio naar Google en Chromium zonder sleutels doet stilletjes
   niets. Terugval, geen bestemming.
3. **Alleen opnemen.** Geen tekst, wel een knop om de opname te bewaren, zodat
   een middag met publiek niet verdampt.

Welke het geworden is zie je aan de regel onder het tekstvak.

## Wat de dienst moet kunnen

Twee routes, allebei op hetzelfde adres als de biblio-backend (leeg = deze
server, dus `http://localhost:8080/api/transcribe` op de tafel).

```
GET  api/transcribe   →  200 {"ok":true,"model":"small"}
```

Dit is de polsslag: de tafel vraagt hem één keer per sessie en kiest op het
antwoord. Alles wat geen 200 is betekent "geen dienst" — dan valt de tafel
terug, zonder te klagen.

```
POST api/transcribe   multipart/form-data
                        audio = een compleet audiobestand (webm/opus, ~8 s)
                        lang  = "nl" of "en"
                      →  200 {"text":"…"}
```

Elk blokje is een op zichzelf staand bestand, geen fragment uit een stroom: de
tafel start voor elk blokje een nieuwe recorder. Leeg antwoord (`{"text":""}`)
is prima — stilte hoort niets op te leveren. De tafel plakt de blokjes met een
spatie achter elkaar; interpunctie moet dus uit het model komen.

Blokjes worden op volgorde verstuurd en op volgorde verwerkt. Valt de dienst
weg, dan blijft de opname doorlopen en verschijnt er één melding in het venster
— niet één per blokje.

## De dienst zelf

`deploy/transcribe/transcribe.py` is die dienst: `faster-whisper` met model
`small` (voor Nederlands is dat de ondergrens voor straatnamen, `base` verzint
te veel), een server op de standaardbibliotheek, geen framework. Op een NUC
zonder GPU haalt `small` ongeveer realtime; blijft hij achterlopen, dan is
`CHUNK_MS` in `speech.js` de knop om aan te draaien — of `PUCK_STT_MODEL=base`.

Neerzetten op de NUC:

```sh
sudo ./deploy/transcribe/install.sh
```

Dat maakt een venv in `~/.local/share/puck-stt/venv` (bewust buiten de repo,
want `deploy/update.sh` doet daar een `reset --hard`), haalt het model alvast
op zodat de eerste groep bezoekers niet staat te wachten, en zet
`puck-stt.service` neer. Controleren:

```sh
systemctl status puck-stt
journalctl -u puck-stt -f
curl http://localhost:8770/api/transcribe
```

Instellingen komen uit de omgeving en mogen in `~/.config/puck-table.env`:
`PUCK_STT_MODEL` (small), `PUCK_STT_PORT` (8770), `PUCK_STT_BIND` (0.0.0.0),
`PUCK_STT_DEVICE`/`PUCK_STT_COMPUTE` (cpu/int8), `PUCK_STT_MODEL_DIR` voor een
machine zonder internet.

Twee dingen zitten er expres in. Op stilte vult whisper de leegte met wat het
uit ondertitelbestanden kent — "Ondertiteling door de Amara.org gemeenschap"
in de opbrengst van een participatiemiddag is geen grap, dus er staat een
VAD-filter voor en een lijst met bekende onzin achter. En een blokje dat
misgaat geeft een 500 met uitleg terug in plaats van de dienst mee te nemen;
de tafel meldt dat één keer en neemt door.

`deploy/transcribe/test_dienst.py` controleert het contract zonder model: hij
zet er een neppe uitschrijver in en kijkt of de polsslag, de CORS-kop, de
multipart en de foutafhandeling kloppen. Draaien met gewoon `python3`.

## Hoe de tafel de dienst vindt

De statische server op de NUC is `python3 -m http.server` en kan niets
doorsturen, dus de dienst draait naast de tafel op zijn eigen poort in plaats
van op `/api` van dezelfde server. `speech.js` zoekt daarom in deze volgorde:

1. het adres dat is opgegeven (`?stt=http://…`, of anders het adres van de
   kennisgraaf) — is dat er, dan precies daar en nergens anders;
2. deze server zelf (`api/transcribe`) — zo werkt de vite-dev-server, die die
   route naar `localhost:8770` stuurt;
3. dezelfde machine op poort 8770. Dat is wat de tafel op de NUC vindt.

Dus: niets instellen is het gewone geval. Draait de uitschrijver op een andere
machine, open de tafel dan met `?stt=http://<machine>:8770`.

## Microfoon

- De microfoon bestaat alleen in een *secure context*. `http://localhost` telt
  mee — zo opent de kiosk de tafel — maar `http://<ip>:8080` vanaf een andere
  laptop niet. Daar meldt de tafel dat uitschrijven niet kan, en dat klopt.
- De toestemmingsvraag klikt niemand weg aan een tafel zonder muis. `deploy/
  kiosk.sh` start chromium daarom met `--use-fake-ui-for-media-stream`; die vlag
  slaat de vraag over en geeft de echte microfoon door.
- Eén opname tegelijk, en hij stopt zodra het venster dichtgaat. Een microfoon
  die stilletjes doorluistert bij een gesloten venster is precies wat je aan een
  tafel met publiek niet wilt.
