# Puck-tafel

Een multi-touch participatietafel. Je legt een fysieke puck op het glas en
zet daarmee een markering op de kaart: een oordeel, een toelichting, en het
gesprek dat eromheen gevoerd wordt. Onder de kaart ligt de kennisgraaf van
coco-biblio, zodat de tafel kan laten zien wat er over die plek al bekend is.

Een puck heeft voetjes; het scherm ziet daar contactpunten van, en het
patroon daartussen is wat hem tot déze puck maakt — dat blijft gelijk, waar
hij ook ligt en hoe hij ook gedraaid is. Meer dan dat weet de tafel niet van
hem, en meer is er niet nodig. Er zijn drie vormen:

- **Driehoek** — drie stukjes tape. De verhouding van de zijden is de puck.
- **Ring** — vijf pootjes op één cirkel. De gaten tussen de hoeken zijn de
  puck.
- **Roostercode** — de ring in twaalf vakjes van 30°, en welke vakjes een
  pootje hebben ís de puck. De tafel meet dan niet "hoeveel graden ernaast"
  maar "in welk vakje", dus een pootje mag een halve vakbreedte verschuiven.
  De diameter van de ring telt als tweede kenmerk mee: dezelfde code op
  26 mm is een andere puck dan op 34 mm.

## Beginnen

```sh
npm install
npm run dev          # http://localhost:5174
```

Zonder backend werkt de tafel gewoon: dan komt de kennisgraaf uit
`exe/public/fixtures/` — de graaf van Breda, hetzelfde gebied waar de tafel
staat. Wil je de echte backend erbij, start dan coco-biblio (die luistert op 8081) of wijs met `BIBLIO_API=…` naar een andere. De uitschrijfdienst voor
het gesprek staat los daarvan; zie [deploy/TRANSCRIPTIE.md](deploy/TRANSCRIPTIE.md).

## Wat er te draaien valt

| Opdracht                | Wat het doet                                                                   |
| ----------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`           | De tafel op poort 5174, met herladen tijdens het werken.                       |
| `npm run build`         | Bouwt naar `dist/`, met relatieve paden zodat het ook achter een subpad werkt. |
| `npm run preview`       | De gebouwde tafel op poort 8080.                                               |
| `npm test`              | De eenheidstests (Vitest). Snel — dit draai je tijdens het typen.              |
| `npm run test:watch`    | Dezelfde, maar die blijven meekijken.                                          |
| `npm run test:coverage` | Met dekkingsverslag in `coverage/`.                                            |
| `npm run smoke`         | De rooktest: een echte Chromium door de hele tafel.                            |
| `npm run lint`          | ESLint — alleen echte fouten, geen stijl.                                      |
| `npm run format`        | Prettier over alles wat onder de huisstijl valt.                               |
| `npm run spell`         | Spellingcontrole, Nederlands én Engels.                                        |
| `npm run typecheck`     | `tsc --noEmit` over de TypeScript-kant.                                        |
| `npm run check`         | Alles hierboven behalve de rooktest. Dit is wat CI draait.                     |

## Testen

Twee soorten, en ze beantwoorden verschillende vragen.

**Eenheidstests** (`src/test/unit/`, Vitest) meten het rekenwerk na dat geen
browser nodig heeft: de meetkunde onder de puckherkenning, en wat er uit de
opslag terug mag komen. Ze draaien in een seconde, dus je kunt ze aan laten
staan terwijl je werkt. De meetkundetests in
[`src/test/unit/geometry.test.ts`](src/test/unit/geometry.test.ts) draaien
tegen de gebouwde `.wasm` en kijken of de Rust-kant en de TypeScript-kant
elkaar nog verstaan; de crate zelf heeft zijn eigen `cargo test`
(`npm run wasm:test`).

**De rooktest** (`src/test/smoke.ts`, Playwright) bouwt de app met vite,
start een echte Chromium en loopt er doorheen. Geen backend nodig: `@biblio`
wordt vervangen door een stub. Wat hij nameet is met opzet het spul dat aan
een tafel met publiek kapot mag gaan zonder dat iemand het merkt —
vastleggen, typen dat bewaard blijft, een kapotte opslag, vier pucks tegelijk
(en dus de herkenning in de wasm), twee kanten van de tafel, en de meldingen
die niet in stilte mogen verdwijnen.

De eerste keer moet Chromium nog opgehaald worden:

```sh
npx playwright install chromium
```

## Huisstijl

79 kolommen, 4 spaties. Dat staat in [`.editorconfig`](.editorconfig) voor je
editor en in [`prettier.config.mjs`](prettier.config.mjs) voor de opmaak; de
[`.vscode/`](.vscode/)-map zet het in VS Code goed en beveelt de bijbehorende
uitbreidingen aan.

De bestanden van vóór die afspraak — `exe/index.html` en de taaltabel
`src/i18n/L.ts` — staan in [`.prettierignore`](.prettierignore) en houden hun
eigen opmaak. Ze zijn met de hand uitgelijnd, en een herformattering maakt er
gehusselde regels van waarin `git blame` niets meer terugvindt. De rest van
`src/` en de opmaak in `exe/styles/` volgen de huisstijl.

Eén symbool per bestand: elk `.ts`-bestand in `src/` exporteert precies één
ding — een functie, een type, een constante of een toestandsobject — en heet
ernaar. Wie `openNote` zoekt, opent `src/notes/openNote.ts`. Gedeelde,
veranderlijke toestand staat in de objecten in `src/state/`.

Het commentaar is Nederlands en legt uit _waarom_ iets zo is, niet wat er
staat. Dat is de afspraak waar deze repo op draait, en de reden dat er een
spellingcontrole overheen gaat: het is proza waar naar verwezen wordt.

## Waar wat staat

```
exe/                De app zelf: wat je in een browser opent. Vite's root.
  index.html          De pagina, met alle panelen erin.
  styles/             De opmaak in Sass; main.scss bepaalt de volgorde.
    abstracts/          Kleuren, fade(), light(), breekpunten. Geen CSS.
    base/               Tokens, reset, tekst, bouwstenen, formulier.
    layout/             Het paneel zelf, het menu, de balken.
    components/         Elk venster: notitie, toetsenbord, graaf, analyse…
  public/fixtures/    De graaf van Breda, voor als er geen backend is.
src/                Alle code. Eén symbool per bestand.
  main.ts             Het enige bestand dat iets dóet bij het laden.
  config/             CFG en de vaste tabellen (kaartbeelden, demo, toetsen).
  state/              De veranderlijke toestand: ui, view, pins, tracks, …
  types/              De typen; global.d.ts voor wat de browser niet kent.
  i18n/               De taaltabel en tr().
  map/                Web Mercator, tegels, de kaartlaag, offline bewaren.
  puck/               Herkennen, volgen, het ringmenu, de sleepkopieën,
                      het meetvenster, en geometry/ — de brug naar de wasm.
  wasm/puck-geometry/ De Rust-crate: waar ligt een puck en hoe is hij
                      gedraaid. Gebouwd naar src/puck/geometry/*.wasm.
  pins/, notes/,      Markeringen, de notitievensters, het gesprek.
  talk/
  input/              Aanraken, muis, wiel, toetsen — de handlers.
  render/             De tekenlus en alles wat op het canvas komt.
  ui/                 Menu, toetsenbord, panelen, analyse, taal, …
  kg/                 De kennisgraaf — de enige plek die coco-biblio kent.
  speech/             Spraak naar tekst; kiest zelf tussen dienst en browser.
  boot/               wireEvents: alle knoppen en listeners aansluiten.
  test/unit/          Eenheidstests (Vitest).
  test/smoke.ts       De rooktest (Playwright).
vendor/             De BiblioClient uit sturnia-node. Andermans code.
deploy/             Installeren en bijwerken op de NUC, plus de kioskstand.
```

## De Rust-kant

De meetkunde die bepaalt wáár een puck ligt en hoe hij gedraaid is — van drie
contactpunten naar zijdeverhoudingen, neus en zwaartepunt, en van een wolk
punten naar de pucks erin — staat in `src/wasm/puck-geometry/` en draait in
de browser als WebAssembly. Geen wasm-bindgen: een platte C-ABI met vaste
buffers, zodat er buiten de compiler niets te installeren valt.

De gebouwde `.wasm` staat in git. `npm run build` heeft dus geen Rust nodig
(de NUC heeft geen cargo); alleen wie `lib.rs` verandert draait:

```sh
rustup target add wasm32-unknown-unknown   # eenmalig
npm run wasm:test                          # cargo test op de laptop
npm run wasm                               # bouwt en kopieert de .wasm
```

## Versie en verwijzen

`VERSION`, `package.json`, `CITATION.cff` en `codemeta.json` noemen dezelfde
versie; wijzig ze samen. Wie naar deze tafel of naar de gegevens ervan
verwijst gebruikt [`CITATION.cff`](CITATION.cff) — GitHub zet daar zelf een
"Cite this repository" bij.
