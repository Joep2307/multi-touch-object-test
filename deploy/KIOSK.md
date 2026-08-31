# De tafel mag alleen de tafel zijn

Drie vingers tegelijk op een touchscreen is voor een bureaubladomgeving een
gebaar: GNOME schuift er een werkblad mee weg of trekt het overzicht open. Dat
gebaar wordt afgevangen door de compositor, **vóór** de browser hem ziet — geen
enkele regel JavaScript kan er iets aan doen, want de aanraking komt niet eens
bij de pagina aan. En drie contactpunten is precies wat een puck is.

Er zijn drie niveaus, van goedkoop naar grondig.

## 1. Xorg in plaats van Wayland — één minuut, probeer dit eerst

Onder X11 doet GNOME geen drievingergebaren op een touchscreen. Uitloggen, op
het aanmeldscherm op het tandwiel klikken, **"op Xorg"** kiezen, weer inloggen.
Werkt het daarna gewoon, dan ben je klaar.

Kijken waar je nu op zit:

```sh
./deploy/kiosk.sh
```

## 2. Gebaren uitzetten, bureaublad houden

```sh
sudo ./deploy/kiosk.sh zacht
```

Zet op GNOME het aantal werkbladen op één (een veeg opzij heeft dan nergens
heen te schuiven) en de hoeken uit; op KDE de schermrandgebaren.

De veeg omhoog naar het overzicht blijft op GNOME/Wayland bestaan — die zit
vast in mutter en is niet met een instelling weg te krijgen. Blijf je daar last
van houden, ga dan naar stap 3.

## 3. Kiosk — geen bureaublad meer

```sh
sudo ./deploy/kiosk.sh kiosk
sudo reboot
```

Zet [cage](https://www.hjdskes.nl/projects/cage/) neer: een compositor die
precies één venster kent. Geen werkbladen, geen overzicht, geen gebaren — er is
niets om heen te vegen. De NUC start op in de tafel en verder niets; het
bureaublad start niet meer op. Dat is ook wat je op een tentoonstelling wilt:
niemand kan er per ongeluk uit.

- eruit komen: **Ctrl+Alt+F2** geeft een console
- terugdraaien: `sudo ./deploy/kiosk.sh terug` en herstarten
- bijwerken blijft gewoon werken: `puck-update.timer` staat er los van

De browser start meteen met de vlaggen die de rest ook stilhouden:
`--kiosk --disable-pinch --overscroll-history-navigation=0 --touch-events=enabled`.

## Wat de pagina zelf al doet

`html,body` staan op `touch-action:none` en `overscroll-behavior:none`, dus de
browser zoomt en scrollt niet mee. Tijdens het meten in **Puck herkennen** staat
de kaart ook stil (`mapMovable()` kijkt naar `learn.open`). Alles wat daarbuiten
misgaat, gaat buiten de pagina om.
