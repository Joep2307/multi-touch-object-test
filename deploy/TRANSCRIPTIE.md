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

## Wat er vanavond nog moet gebeuren

Een klein servicetje naast coco-biblio, bijvoorbeeld `faster-whisper` met model
`small` (Nederlands: `small` is de ondergrens voor straatnamen, `base` verzint
te veel), een systemd-unit in de trant van `deploy/install.sh`, en die twee
routes. Op een NUC zonder GPU haalt `small` ongeveer realtime; blijft hij
achterlopen, dan is `CHUNK_MS` in `speech.js` de knop om aan te draaien.

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
