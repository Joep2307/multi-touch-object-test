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
