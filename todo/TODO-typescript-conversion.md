# TODO — TypeScript, modulair, met een Rust/wasm-kern voor de pucks

Doel: `app.js` (4200 regels, één bestand), `kg.js` en `speech.js` worden een
TypeScript-codebase met één symbool per bestand. De meetkunde die bepaalt
**waar een puck ligt en hoe hij gedraaid is** verhuist naar een kleine
Rust-bibliotheek die als WebAssembly in de app draait. Gedrag verandert niet.

Stand: **klaar** (4 september 2026). Wat hieronder nog open staat is
vervolgwerk, geen deel van de omzetting.

## Uitgangspunten

- **Alle code in `src/`.** TypeScript in `src/**`, de Rust-crate in
  `src/wasm/puck-geometry/`, de tests in `src/test/`.
- **De app zelf in `exe/`.** `exe/index.html`, `exe/styles/…`,
  `exe/public/fixtures/…` — het ding dat je in een browser opent. Vite's root
  is `exe/`; `index.html` laadt `../src/main.ts` en `styles/main.scss`.
- **Eén symbool per bestand.** Elk `.ts`-bestand exporteert precies één ding:
  een functie, een type, een constante of een toestandsobject. Hulpjes die
  alleen dat ene symbool dienen mogen privé in hetzelfde bestand staan.
- **Gedeelde, veranderlijke toestand** (`let lang`, `let uiScale`, `W`, `H`,
  `pxPerMM`, …) kan in ES-modules niet van buitenaf worden toegewezen. Die
  variabelen zijn velden op kleine toestandsobjecten in `src/state/`
  (`ui.lang`, `ui.scale`, `view.W`, …). Eén object per bestand.
- **De gebouwde `.wasm` staat in git.** De NUC bouwt met `npm run build` en
  heeft geen Rust-toolchain; `npm run wasm` is een aparte stap op de laptop
  die `src/puck/geometry/puck_geometry.wasm` ververst. Geen wasm-bindgen:
  een platte C-ABI met vaste buffers in het lineaire geheugen, zodat er
  niets te installeren valt buiten `rustup target add wasm32-unknown-unknown`.
- `vendor/` blijft staan: dat is andermans code (sturnia-node), niet de onze.
- Commentaar en namen blijven Nederlands waar ze dat waren; de uitleg bij
  elk ontwerpbesluit reist mee naar het nieuwe bestand.

## Stappen

### 0. Voorbereiding

- [x] Rust-toolchain met `wasm32-unknown-unknown` (rustup in `~/.cargo`,
      zonder de Homebrew-`cargo` of het PATH aan te raken).
- [x] `npm install` — de lege `package-lock.json` opnieuw laten schrijven.

### 1. Rust-crate `src/wasm/puck-geometry/`

- [x] `Cargo.toml`: `crate-type = ["cdylib", "rlib"]`, `opt-level = "s"`,
      `lto`, `panic = "abort"`, geen afhankelijkheden.
- [x] `src/lib.rs` — pure meetkunde, geen toestand behalve I/O-buffers:
      `describe`, `pads_for`, `recognise`, `wrap_angle`. Zelfde
      kandidatenvolgorde, zelfde scores en dezelfde stabiele sortering als de
      JavaScript-versie.
- [x] C-ABI: `points_ptr()`, `templates_ptr()`, `tracks_ptr()`, `out_ptr()`,
      `used_ptr()`, capaciteiten, `describe_triangle`, `pads_for_template`,
      `wrap_angle_rad`, `recognise_pucks`. Layouts in
      `src/puck/geometry/layout.ts` én in `lib.rs`.
- [x] `cargo test` (10 tests): bekende driehoeken, twee pucks van dezelfde
      soort, spookdriehoek over twee pucks, gedegenereerde invoer, de ABI.
- [x] `npm run wasm` bouwt en kopieert (33 kB) naar
      `src/puck/geometry/puck_geometry.wasm`.

### 2. Projectinrichting

- [x] `exe/index.html` (script → `../src/main.ts`), `exe/styles.css`,
      `exe/public/fixtures/` verhuisd.
- [x] `vite.config.ts`: `root: "exe"`, `build.outDir: "../dist"`, alias
      `@biblio`, dezelfde proxy en backend-gate.
- [x] `tsconfig.json`: `strict`, `moduleResolution: bundler`, `vite/client`.
- [x] `package.json`: `dev`, `build`, `check`, `typecheck`, `wasm`,
      `wasm:test`, `smoke`, `test`.
- [x] `deploy/update.sh`: `--outDir ../dist.nieuw` (relatief aan `exe/`).
- [x] `.gitignore`: `src/wasm/**/target/`.

### 3. TypeScript-modules (één symbool per bestand)

- [x] ~300 bestanden in `src/` — zie "Waar wat staat" in README.md.
- [x] `npm run typecheck` schoon; `npm run lint`, `format:check` en `spell`
      schoon (de rooktest en `L.ts` uitgezonderd van de opmaak).

### 4. Tests

- [x] `src/test/smoke.ts` bouwt met vite naar een tijdelijke map (met
      `@biblio` op een stub) en laat dezelfde twaalf scenario's lopen —
      66 controles, alle groen, inclusief vier pucks tegelijk via de wasm.
- [x] `src/test/unit/*.test.ts` (Vitest, 51 tests): de meetkunde via de
      gebouwde wasm, wat er uit de opslag mag komen, de kennisgraaf.

### 5. Opruimen

- [x] `app.js`, `kg.js`, `speech.js`, `index.html`, `styles.css`, `public/`,
      `test/`, `lib/`, `vite.config.js` uit de root.
- [x] README, deploy/TRANSCRIPTIE.md, .editorconfig, .prettierignore,
      eslint/cspell wijzen naar de nieuwe indeling.
- [x] `STAMP_FILES` in de bouwstempel: `index.html` en `version.json`.

## Vervolgwerk (niet gedaan, wel gezien)

- `track()` — het volgen over beeldjes heen (buffer, hoekfilter, het
  koppelen van detecties aan bestaande pucks) — staat nog in TypeScript.
  Het is puur rekenwerk en zou ook naar de crate kunnen; dan gaat de hele
  keten van contactpunt tot puck door Rust.
- `src/i18n/L.ts` is de taaltabel uit app.js, letterlijk overgenomen (en
  daarom van de opmaak uitgezonderd). Eén bestand per taal zou de
  huisstijl wél halen.
- ESLint kent de `.ts` in `src/` via typescript-eslint; de rooktest heeft
  een paar bewuste `any`'s in `page.evaluate`.

# TODO — roostercode en diameter als derde puckvorm

Doel: de tafel herkent een puck niet alleen aan vrije hoeken (vijf pootjes,
`angles`) of aan zijdeverhoudingen (driehoek van tape), maar ook aan een
**roostercode**: de ring is in twaalf vakjes van 30° verdeeld en de puck is
het patroon van welke vakjes bezet zijn. Daarnaast telt de **diameter** van
de ring als tweede kenmerk mee, zodat dezelfde code op 26 mm een andere puck
is dan op 34 mm.

Waarom: de vrije-hoekenring vergelijkt vijf continue hoeken met een grens van
12° en een marge van 3° — een pootje dat 2 mm trilt zit daar dicht tegenaan.
Een rooster meet niet "hoeveel graden ernaast" maar "in welk vakje": met
vakjes van 30° mag een pootje ±15° verschuiven en valt het nog goed. En waar
de hoekenring vier pucks aankan, geeft de code er zes per diameter, met een
onderlinge afstand van vier bits.

Stand: **klaar** (8 september 2026). `npm run typecheck`, `eslint`,
`prettier` en `cspell` zijn schoon; de eenheidstests staan in
`src/test/unit/slots.test.ts` en moeten op de Mac gedraaid worden
(`npm test`) — in de sessie-VM draait vitest niet.

Uitgangspunten (met Joep afgesproken, 8 sep 2026):

- **Ernaast, niet in plaats van.** Driehoek, hoekenring en roostercode
  bestaan naast elkaar; de vier gedrukte pucks blijven werken.
- **Twaalf vakjes** van 30°. Op een ring van 34 mm liggen naburige vakjes
  17,8 mm uit elkaar — ruim voor een pootje van 6 mm.
- **Twee ringmaten: 34 en 26 mm.** 34 is de huidige ring; 26 past nog ruim
  binnen de schijf van Ø90.
- **Zes pootjes per puck**, waarvan drie vast (vakje 0, 1 en 3 — de pijl
  staat op vakje 0). Die drie maken de puck met het oog herkenbaar en de
  codes onderling ver genoeg uit elkaar. Vijf punten blijven de
  hoekenring: dat houdt het inlezen ondubbelzinnig.
- **De herkenning blijft in TypeScript**, net als de rest van de omzetting
  ([[omzetting-port]]). De Rust-crate wordt pas herschreven als de
  TS-versie bewezen gelijk is.

## Stappen

### 1. Model en meetkunde

- [x] `Template` krijgt `slots` (aantal vakjes) en `code` (bitmasker,
      bit _i_ = vakje _i_); `ringMM` doet dienst als diameter, net als bij
      de hoekenring.
- [x] `config/SLOT_CODES.ts`: de zes codes met hun vakjes, plus de twee
      ringmaten. Gekozen met een zoekopdracht: zelfsymmetrie ≥ 4 (de puck
      lijkt niet op zichzelf als je hem een vakje verder draait) en
      onderlinge afstand ≥ 4 bits.
- [x] `describeSlots(pts, slots)`: cirkel passen, hoeken lezen, de stand van
      het rooster schatten (cirkelgemiddelde van de resten) en teruggeven
      welke vakjes bezet zijn — plus `snap`, hoe strak de pootjes in het
      rooster vallen, en `dup` als twee pootjes in hetzelfde vakje vallen.
- [x] `matchSlots(d, tpl)`: alle twaalf draaiingen langs, tel ontbrekende en
      overtollige bits, en geef de beste draaiing terug als hoek — de hoek
      als cirkelgemiddelde van alle pootjes, niet als vakje, zodat de stand
      fijner is dan 30°.
- [x] Hulpjes: `rotateCode`, `codeDistance`, `codeSelfSym`, `codeOf`,
      `codeSlots`, `slotWidth`, `slotPhase`, `slotIndexes`, `isSlotted`,
      `tplSlots`, `codeText`, `sizeErr`.

### 2. Herkenning

- [x] `recognise()`: naast de vijftallen ook de hele puntengroep op één
      cirkel als roosterkandidaat. Geen combinaties: alle punten op de
      cirkel vormen samen één code, dus dat kost niets extra.
- [x] Diameter telt mee vóór de keuze, niet erna: sjablonen waarvan de
      straal te ver afligt vallen af, en pas daarna wordt de beste gekozen
      en de marge geëist. Dat geldt ook voor de hoekenring — nu wordt daar
      eerst op hoeken gekozen en dan op maat afgekeurd.
- [x] Vasthouden met een pootje minder: voor een puck die al gevolgd wordt
      mag de code één bit missen (`slotHoldBits`), tegen alleen zijn eigen
      sjabloon.

### 3. Inlezen ("Puck herkennen")

- [x] Vier tot acht punten op één cirkel die in het rooster vallen (en niet
      precies vijf) worden een roostermeting; vijf blijft de hoekenring,
      drie de driehoek, zes-in-twee-driehoeken het duo.
- [x] `learnMedian`: per vakje een meerderheidsstem over de reeks, en de
      mediaan van de straal — geen middeling van hoeken.
- [x] Waarschuwing bij een code die te veel op zichzelf of op een bestaande
      puck lijkt (`codeSelfSym`, `shapeClash`), net als bij de gelijkbenige
      driehoek.
- [x] `applyShape`, `cloneTpl`, `tplWire`, `resetTemplates` kennen de derde
      vorm; `saveTemplates`/`restoreTemplates` bewaren voortaan óók
      `angles`, `ringMM`, `slots` en `code` — nu gaat een ingelezen ring bij
      het herladen verloren.

### 4. Bouwtekening en teksten

- [x] `padsFor` geeft de pootjes van een roosterpuck; `buildSheet` tekent de
      cirkel met de twaalf vakjes en zet de code eronder.
- [x] Onderaan de bouwtekening de zes voorstellen (`SLOT_CODES`) × twee
      maten, met hun coördinaten in millimeters, zodat je ze kunt printen
      vóór je ze inleest.
- [x] Nieuwe regels in `L.ts`, Nederlands en Engels.

### 5. Controle

- [x] `src/test/unit/slots.test.ts`: een gedraaide en verschoven puck houdt
      zijn code; een ontbrekend pootje ook; een overtollige vinger op de
      cirkel ook; twee codes worden nooit verwisseld; dezelfde code op 26 en
      34 mm blijven uit elkaar; de zes voorstellen hebben onderling afstand
      vier.
- [x] `npm run typecheck` (draait overal), en op de Mac `npm run check`.

# TODO — ruismeting in de puck-diagnose

Doel: aan de tafel zelf meten hoe nauwkeurig het glas de pootjes van een puck
teruggeeft, zodat de keuze voor een codeopzet (hoeveel vakjes, hoeveel
pootjes) op een gemeten getal rust en niet op een aanname.

Waarom: hoeveel codes je veilig uit elkaar kunt houden hangt volledig af van
de spreiding per contactpunt. Bij 1 mm kan een puck met drie pootjes op negen
vakjes prima; bij 2 mm noemt diezelfde opzet in 7% van de beeldjes de
_verkeerde_ puck, en bij 3 mm in 17%. Zes pootjes op twaalf vakjes zwijgen in
plaats van zich te vergissen. Het verschil tussen die werelden is één getal
dat we nu niet hebben.

Stand: **klaar** (8 september 2026). `npm run typecheck`, `eslint`,
`prettier` en `cspell` schoon; `src/test/unit/noise.test.ts` moet op de Mac
gedraaid worden (`npm test`).

## Wat het meet

Leg een puck stil op het glas terwijl **Puck-diagnose** aan staat; na een
korte rustpauze telt de tafel 240 beeldjes en toont dan:

- **σ per pootje** — de spreiding van elk contactpunt om zijn eigen
  gemiddelde, per as in millimeters. Dat is precies het getal waar de
  simulatie op draait.
- **uitval** — hoe vaak een pootje in een beeldje helemaal niet gemeld werd.
  Bij geleidend PLA is dat vaak het echte probleem, niet de meetkunde.
- **extra punten** — een hand op het glas, of een pootje dat dubbel meldt.
- **straal** — gemiddelde en spreiding van de gepaste cirkel. Wijkt het
  gemiddelde af van de bouwtekening, dan klopt `CFG.screenDiagIn` niet.
- **rooster** — hoe ver de pootjes gemiddeld van het midden van hun vakje
  vallen, en hoe vaak de gelezen code omslaat.
- **een oordeel** in één regel: welke codeopzet deze tafel aankan.

## Stappen

- [x] `config/NOISE.ts` — aantal beeldjes, rustdrempel, koppelafstand.
- [x] `types/NoiseFoot.ts`, `types/NoiseReport.ts`, `state/noise.ts`.
- [x] `puck/noise/updateNoise.ts` — per beeldje: contactpunten koppelen aan
      hun ankerpunt (dichtstbijzijnde binnen 10 mm), sommen bijhouden, straal
      en code via `describeSlots`. Beweegt de puck, dan begint de reeks
      opnieuw.
- [x] `puck/noise/noiseReport.ts` — sommen naar millimeters en percentages,
      plus het oordeel.
- [x] `render/drawNoise.ts` — paneel rechtsboven, zelfde vorm als
      `drawPuckDiag` in de monoliet. Tekst in het Nederlands, net als dat
      paneel; de diagnose is gereedschap voor wie de tafel bouwt.
- [x] Inhaken in `render/frame.ts`, alleen als `ui.debugMode` aan staat.
- [x] Controle: ruis van bekende grootte erin, en kijken of er hetzelfde
      uitkomt.

## Wat de controle opleverde

Met bekende ruis erin (0,5 / 1 / 2 mm) komt er 0,50 / 1,00 / 1,99 mm uit.
Drie dingen moesten daarvoor anders, en alle drie logen ze de tafel
rustiger dan hij is:

1. **Ankers na het stilhouden opnieuw in het midden zetten.** Een anker uit
   één beeldje draagt de ruis van dat beeldje; de punten liggen er dan
   scheef omheen en de verste vallen buiten de koppelafstand. Gemeten kwam
   er 1,7 uit waar 2,0 in ging.
2. **Beweging als vector meten, niet als afstand.** Het gemiddelde van de
   afstanden groeit mee met de ruis (bij 2 mm ligt elk punt al 3,5 mm van
   zijn anker), dus de reeks begon eindeloos opnieuw. Als vector opgeteld
   valt de ruis tegen elkaar weg en blijft alleen echte verplaatsing over —
   en anders dan het zwaartepunt struikelt dat niet over een pootje dat
   wegvalt.
3. **De code canoniek tellen.** Het rooster mag een vakje verder gelezen
   worden zonder dat er iets mis is (`matchSlots` probeert alle draaiingen),
   dus zonder canonieke vorm meldde een perfect stabiele puck "code stabiel
   53%".

Boven 2,5 mm loopt de gemeten spreiding zelf vast: een punt dat ver genoeg
wegvalt wordt niet meer aan zijn pootje gekoppeld. Daarom weegt de uitval
zelfstandig mee in het oordeel — bij 3 mm ruis staat die op 34%, en dat is
het signaal dat de meting op is.
