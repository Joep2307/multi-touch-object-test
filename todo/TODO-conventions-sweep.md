# TODO — Conventions sweep: barrels, one symbol per file, 79 columns

Status: **planned, not started.** Written 11 September 2026 after an
audit of the tree against the standing conventions. The audit's
numbers are in "What the audit found" below; every phase refers back
to them. The Base architecture plan (`TODO.md`) and the interaction
model plan (`TODO-interaction-model.md`) are untouched by this; this
plan only brings the existing tree in line with rules those two
already state.

Verified before starting: `npm run check` passes all 460 unit tests,
`npm run build` succeeds.

## Goal

When this is done, the whole of `src/` follows the same four rules
`src/core/` has followed since it was created, and a test fails the
moment any of them is broken again:

1. **Every folder has an `index.ts` barrel**, and a cross-folder
   import goes through it — never deep into a sibling's files.
2. **One symbol per file**, filename is the symbol name verbatim.
   `constants.ts` is the one exception.
3. **79 columns**, everywhere Prettier reaches and also where it does
   not (comments, string literals, decorative rules).
4. **All maintained code lives in `src/`**; the app in `exe/`.

Nothing in the running table changes behaviour along the way. Every
phase ends with `npm run check` and `npm run build` green, and the
phases that touch module loading also end with `npm run smoke` green,
because the smoke test is the only thing that loads the app in the
real entry order.

---

## What the audit found

Counted on 11 September 2026 over `src/` and `exe/`, excluding
`src/wasm/` and `exe/public/fixtures/`.

**Barrels.** 24 exist, all under `src/core/` and `src/bridge/`. The
other 29 folders have none: the 17 top-level ones (`boot`, `capture`,
`config`, `dom`, `i18n`, `input`, `kg`, `map`, `notes`, `pins`, `puck`,
`render`, `speech`, `state`, `talk`, `types`, `ui`) and 12 subfolders
(`ui/{analytics,keyboard,kgInfo,menu,panels,resetKey}`,
`puck/{geometry,learn,noise,ring,sim,tray}`). 1,073 cross-folder
imports in 326 files reach deep into another folder.

**One symbol per file.** 13 files export two top-level symbols, each
a symbol plus its companion type or storage key:

    src/puck/saveTemplates.ts            saveTemplates + TPL_KEY
    src/puck/saveOwnPucks.ts             saveOwnPucks + OWN_KEY
    src/puck/geometry/splitDuo.ts        splitDuo + DuoSplit
    src/types/Phrases.ts                 Phrases + Phrase
    src/core/session/SettingsResolver.ts SettingsResolver + SettingsQuery
    src/core/session/OverflowResolver.ts OverflowResolver + OverflowDecision
    src/core/programme/ProgrammeLoader.ts
                                         ProgrammeLoader + LoadResult
    src/core/presentation/RegionTracker.ts
                                         RegionTracker + RegionUpdate
    src/core/physical/matchSignature.ts  matchSignature + SignatureMatch
    src/core/behaviour/RuleTrace.ts      RuleTrace + RuleTraceEntry
    src/core/behaviour/EffectDefinition.ts
                                         EffectDefinition + EffectType
    src/core/behaviour/ConditionDefinition.ts
                                         ConditionDefinition
                                         + ConditionSubjectType
    src/core/base/position/scoreFootprint.ts
                                         scoreFootprint + FootprintScore

`src/types/global.d.ts` declares three ambient interfaces; it is a
declaration file, not a module, and stays as it is.

**79 columns.** 231 lines are longer, `src/i18n/L.ts` excluded (it is
the hand-aligned two-column language table and stays exempt, as
`.prettierignore` explains). 68 are decorative `═══`/`───` rules,
about
108 are comment prose, the rest are string literals (demo texts, tile
URLs, HTML template literals) and a handful of long `import` lines in
`src/core/` that the barrels of phase 4 shorten anyway. Prettier
passes on all of them: it does not reflow comments or strings.

**Code outside `src/`.** `src/capture/wireCapture.ts` imports
`../../capture` — the root `capture.ts`, 300 lines of live code that
the `.prettierignore` and `cspell.config.js` lists describe as part of
the historical pre-module snapshot. The rest of that snapshot
(`app.ts`, `kg.ts`, `speech.ts`, `globals.d.ts`, `index.html`,
`styles.css`, `test/`) is genuinely dead: nothing under `src/` or
`exe/` reaches it. The snapshot's own `app.ts` imports `./capture.js`,
so the snapshot only stays coherent if it keeps its copy.

**Work at import time.** Under a barrel, importing one symbol from a
folder evaluates every file in it. Three modules in the app tree do
work when evaluated, and today's unit tests avoid them by importing
deep (the comment in `vitest.config.js` says exactly this):

- `src/state/view.ts` calls `el("c")` and `document.createElement`.
- `src/state/ui.ts` calls `matchMedia` unguarded, and calls
  `storedUiScale()` from `src/ui/` — the only place in the tree where
  a module reads a binding from another folder _at evaluation time_
  across a folder cycle. Under barrels, whichever of `state` and `ui`
  is entered second sees the other half-evaluated; depending on the
  entry order that is a `ReferenceError` on load.
- `src/main.ts`, which is the entry and is supposed to.

`src/config/QS.ts` and `src/map/MV.ts` also run at import but wrap
the browser calls in `try`/`catch` and are safe under Node.

**Folder cycles.** At file level the tree is nearly acyclic: two small
intra-folder cycles (`puck/learn`, `ui/analytics`), both harmless.
At _folder_ level, eleven folders form one strongly connected
component: `bridge`, `puck`, `render`, `talk`, `pins`, `map`, `kg`,
`notes`, `ui`, `state`, `i18n`. Barrels fuse these into one
evaluation cycle. ESM tolerates that as long as no module reads
another's binding at evaluation time — which, after the fix above,
none does.

---

## Decisions

These were weighed before the phases were written; each phase assumes
them.

- **Fuse the cycle, do not re-layer the app tree.** Breaking the
  eleven-folder cycle properly means re-architecting the tree that
  `TODO-interaction-model.md` is already replacing layer by layer.
  Instead: remove the one genuine evaluation-time hazard (phase 1),
  and guard the rest with a runtime test that imports every barrel
  under Node in a fresh module graph (phase 4). The smoke test covers
  the real browser entry order.
- **No work at import time becomes a rule for the whole tree**, not
  just `src/core/`. `state/view.ts` and `state/ui.ts` are changed to
  hold that; `main.ts` is the documented exception. This is what makes
  the barrels testable at all and is the smallest change that does.
- **`storedUiScale` and `defaultUiScale` move from `src/ui/` to
  `src/state/`.** They restore state from storage; they were only in
  `ui/` because `applyMode` uses them. This removes the `state → ui`
  back-edge, which is the one that bites.
- **`installTestHooks` moves from `src/test/` to `src/boot/`.** It
  wires `window.__puck` at boot; `src/test/` is excluded from
  `tsconfig.json` and is not a code folder. `main.ts` then imports
  nothing from `src/test/`.
- **Tests import through barrels, like the core tests already do**
  (48 barrel imports to 10 deep in `src/test/unit/core/`). This is
  what forces phase 1 to be real: a test that imports `../../puck`
  loads `state/view.ts`, and that must be harmless under Node.
- **The root `capture.ts` is re-implemented in `src/capture/` under
  the one-symbol rule; the snapshot keeps its copy and moves, intact,
  to `legacy/`.** Moving rather than deleting keeps the historical
  table reachable without `git log`; deleting is a one-line change
  later if preferred. **This is the one decision the owner may want
  to flip** — everything else in the plan is independent of it.
- **A barrel exports the folder's public surface**, in the style of
  `src/core/contact/index.ts`: values first, then a grouped
  `constants` export, then `export type` lines, alphabetical within
  each group. Helpers only used inside the folder are still their own
  files but are not re-exported.
- **The barrel rule is enforced by a static test, not ESLint.**
  `no-restricted-imports` cannot tell `../core/physical` (a barrel
  directory) from `../core/foo` (a file) by glob. A Vitest test that
  resolves every relative specifier on disk can, and it also carries
  the other three rules. The existing `src/core/` ESLint blocks stay
  as they are.
- **Comments in the moved `capture.ts` are translated to English**,
  as the rest of `src/` was during the TypeScript conversion. The
  essay at the top of the file — why the canvas and not the screen,
  why the size limits — is kept whole; it moves to the top of
  `initCapture.ts`.
- **One commit per phase**, when the owner asks for commits. Each
  phase is independently reviewable and leaves `npm run check` green.

---

## Ground rules

From `TODO.md`, restated so this file stands alone:

- TypeScript, strict; every exported symbol explicitly typed.
- One symbol per file, filename is the symbol name verbatim;
  `constants.ts` is the exception.
- Every folder has an `index.ts` barrel; cross-folder imports go
  through it.
- 79 columns, 4 spaces, LF, double quotes (Prettier as configured),
  semicolons.
- `src/core/` touches no DOM and no app-tree module; the ESLint
  blocks for it are untouched by this plan.
- Nothing does work at import time except `src/main.ts`.

---

## Phase 1 — No work at import time

The enabling phase. Small, and it must land before any barrel does.
**Done 11 September 2026.**

- [x] `src/state/view.ts`: `cv`, `ctx`, `mapLayer`, `mapCtx` stop
      being computed at evaluation. The plan said an `initView()`
      called from `main.ts`; the build chose lazy getters instead —
      each field is looked up and memoised on first read. That needs
      no placeholder value (an `initView()` would have meant a
      `null as unknown as HTMLCanvasElement` cast, which this tree has
      been retiring), no new call in `main.ts`, and no consumer
      change: nothing assigns to or destructures those four fields,
      all fifteen uses are reads.
- [x] `src/state/ui.ts`: `matchMedia` goes through a `media()`
      helper that answers "no" when the function does not exist, so
      the module evaluates under Node without a stored value.
- [x] `src/ui/storedUiScale.ts` and `src/ui/defaultUiScale.ts` moved
      to `src/state/` (`git mv`); `src/state/ui.ts` imports
      `./storedUiScale`, `src/ui/applyMode.ts` imports
      `../state/storedUiScale` (deep for now; phase 4 turns it into
      `../state`).
- [x] `src/test/installTestHooks.ts` moved to `src/boot/`; `main.ts`
      imports `./boot/installTestHooks`.
- [x] `vitest.config.js`: the comment about `src/state/` reading from
      the window on load reworded.
- [x] Check: `npm run check` (460 tests), `npm run build`,
      `npm run smoke` all green.

## Phase 2 — Code out of the root

**Done 11 September 2026.**

- [x] `legacy/` holds the snapshot intact: `app.ts`, `capture.ts`,
      `kg.ts`, `speech.ts`, `globals.d.ts`, `index.html`,
      `styles.css`, `test/smoke.mjs`, `test/taal.mjs` (`git mv`, so
      history follows), plus a `README.md` saying what it is.
- [x] `.prettierignore`, `cspell.config.js` and `eslint.config.js`
      name `legacy/` instead of the eight root files. `.gitignore`
      never mentioned them.
- [x] The capture module re-implemented under `src/capture/`, one
      symbol per file, comments in English, the essay from the top of
      the old file kept whole at the top of `initCapture.ts`. Two
      departures from the sketch above: the film assembler kept its
      old name `renderLapse` rather than `buildLapse`, and
      `captureState()` returns a named `CaptureStatus` type
      (`src/types/CaptureStatus.ts`) rather than an inline literal.
      `src/types/` gained `CapKind`, `CapReason`, `CapEvents`,
      `Lapse`, `CaptureStatus`; `src/state/capture.ts` holds the
      module's state. The `any` casts of the old file are gone —
      `captureStream` and `CanvasCaptureMediaStreamTrack` are in the
      DOM lib — and `getContext("2d")!` became a null check.
- [x] `src/capture/wireCapture.ts` imports the new names; the `cap.`
      namespace is gone with the root file.
- [x] `src/capture/index.ts` exports the public eight and
      `wireCapture`.
- [x] Check: tsc (whole repo and core), lint, format, spell and 490
      unit tests green; `npm run build` and `npm run smoke` green,
      the smoke run opening the capture bar and counting its three
      buttons as before.

Follow-up, not in this plan: nothing under `src/` calls
`cancelCapture`. The old `app.js` called `cancelAll` when a session
was wiped; the conversion dropped the call. A running recording now
survives a wipe. Worth a line in `TODO.md`.

## Phase 3 — One symbol per file

- [ ] Split the 13 files listed above. Each companion gets its own
      file, named after itself: `TPL_KEY.ts`, `OWN_KEY.ts`,
      `DuoSplit.ts`, `Phrase.ts`, `SettingsQuery.ts`,
      `OverflowDecision.ts`, `LoadResult.ts`, `RegionUpdate.ts`,
      `SignatureMatch.ts`, `RuleTraceEntry.ts`, `EffectType.ts`,
      `ConditionSubjectType.ts`, `FootprintScore.ts`. The original
      file imports its companion; the doc comment that explains the
      pair stays with the main symbol.
- [ ] The six `src/core/` barrels that already re-export nine of the
      companions (`session`, `programme`, `presentation`, `physical`,
      `behaviour`, `base/position`) point at the new files.
- [ ] The ten consumer files outside the defining ones import from
      the new files — through the barrel where they already do.
- [ ] Check: `npm run check`, `npm run typecheck:core`,
      `npm run build`.

## Phase 4 — Barrels for the app tree

The big one: 29 barrels, ~1,073 import rewrites in ~326 files. Done
by script, reviewed by eye, verified by compiler.

- [ ] Write the barrels, leaves first so each step compiles, in
      this order:

1. `types`, `config`, `dom`, `speech` — no app-tree imports.
2. `state`, `i18n`, `kg`, `map` — the inner ring.
3. `puck/geometry`, `puck/noise`, `puck/ring`, `puck/sim`,
   `puck/tray`, `puck/learn`, then `puck`.
4. `pins`, `notes`, `talk`, `render`.
5. `ui/analytics`, `ui/keyboard`, `ui/kgInfo`, `ui/menu`,
   `ui/panels`, `ui/resetKey`, then `ui`.
6. `input`, `capture`, `boot`.

A barrel lists every file's symbol except the folder-private helpers
(see Decisions). Sub-barrels are re-exported by the parent
(`puck/index.ts` does `export * from "./learn"` — the one place
`export *` is allowed, because a sub-barrel is already curated).

- [ ] Rewrite the imports with a script kept in the session
      scratchpad, not the repo: for each relative specifier that
      resolves to a file in another folder, replace it with the
      nearest barrel on the path, then merge all imports from one
      barrel into a single statement with specifiers sorted, `type`
      imports in their own `import type` statement. Run Prettier.
      Then `tsc` — the compiler finds every name that two barrels
      both export under one import, or that a barrel forgot.
- [ ] `src/main.ts` and the unit tests under `src/test/unit/` get the
      same treatment; `src/test/smoke.ts` imports nothing from the
      tree and is untouched.
- [ ] `src/test/unit/barrels.test.ts` — the app-tree twin of
      `core/barrels.test.ts`: for each of the 29 barrels,
      `vi.resetModules()` then `await import(barrel)`, expect no
      throw, at least one export, and the whole import under 500 ms.
      Runs under Node, which is the point: it proves nothing in the
      tree needs a browser to _load_. Each barrel imported first in a
      fresh graph is what catches an order-dependent
      `ReferenceError`.
- [ ] `src/test/unit/conventions.test.ts` — the static guard,
      reading the tree with `node:fs`. Its checks:
- [ ] every folder under `src/` (except `src/wasm/`, `src/test/`)
      has an `index.ts`;
- [ ] every relative import specifier in `src/` (tests included)
      that leaves its folder resolves to a directory, not a file;
- [ ] every non-`index`, non-`constants`, non-`.d.ts`,
      non-`.test.ts` file has exactly one top-level `export` and
      its name equals the file's basename;
- [ ] (the 79-column check joins in phase 5).
- [ ] Check: `npm run check`, `npm run build`, `npm run smoke`.

## Phase 5 — 79 columns

231 lines, by hand; no tool reflows a comment well.

- [ ] Decorative rules (68): trim `═══`/`───` lines to end at column
      79; the box headers in `CFG.ts`, `MV.ts`, `KEY_ROWS.ts`,
      `renderTray.ts`, `smoke.ts` and the like.
- [ ] Comment prose (~108): rewrap at 79. Block comments keep their
      3-space continuation indent, line comments stay line comments.
- [ ] String literals: `DEMO_PINS.ts` demo texts and
      `buildQuestion.ts` prompts become adjacent-string concatenation
      broken at a space; tile and font URLs in `TILE_SETS.ts` and
      `loadFonts.ts` break at a `/` the same way; HTML template
      literals in `sheetCard.ts`, `renderLearn.ts`, `ownPuckList.ts`,
      `drawLearnPoints.ts`, `renderRecent.ts`, `renderAnalytics.ts`,
      `renderKeyboard.ts` are split at tag boundaries into
      `\n`-free pieces joined with `+`, so the produced markup is
      byte-identical (assert this for `sheetCard` and
      `renderKeyboard` in a small unit test before touching them).
- [ ] `exe/styles/base/_tokens.scss` (3) and
      `components/_note.scss` (1): break the long values.
- [ ] Long `import` lines in `src/core/`: already resolved by
      phase 4's shorter specifiers; verify none remain.
- [ ] Add to `conventions.test.ts`: no line over 79 columns in
      `src/**/*.ts` and `exe/styles/**/*.scss`, with `src/i18n/L.ts`
      and `exe/index.html` as the only exemptions, named in the test
      with the reason from `.prettierignore`.
- [ ] Check: `npm run check`, `npm run build`. Smoke is not needed;
      nothing here changes a module's behaviour, and the unit test
      above guards the markup.

## Phase 6 — Documentation and configuration

- [ ] `README.md`: the directory tree gains `capture/`, `legacy/`,
      `boot/installTestHooks`; the line "Eén symbool
      per bestand" under `src/` gains "en elke map een index.ts".
- [ ] `ARCHITECTURE.md`: where it describes imports, say that the
      whole tree — not only `src/core/` — imports through barrels and
      does no work at import time.
- [ ] `todo/TODO.md`: one line under Ground rules pointing here for
      the tree-wide guards.
- [ ] `tsconfig.core.json` header comment: "the existing 489 files"
      is stale; fix the number or drop it.
- [ ] `vitest.config.js` comment (done in phase 1; re-read it here).
- [ ] `.vscode/settings.json`: nothing to change; confirm.
- [ ] Final: `npm run check`, `npm run build`, `npm run smoke`, and
      `git status` shows only intended files.

---

## Verification, per phase

| Phase | check | build | smoke | extra                            |
| ----- | ----- | ----- | ----- | -------------------------------- |
| 1     | yes   | yes   | yes   | first frame draws after initView |
| 2     | yes   | yes   | yes   | record button, no-mic message    |
| 3     | yes   | yes   | —     | typecheck:core                   |
| 4     | yes   | yes   | yes   | barrels + conventions tests      |
| 5     | yes   | yes   | —     | markup byte-identical test       |
| 6     | yes   | yes   | yes   | —                                |

## Risks

- **A barrel name collision** — two files in one folder exporting
  the same identifier, or a consumer importing the same name from two
  barrels. The compiler reports both; the fix is a rename, never an
  alias in the barrel.
- **Evaluation-order `ReferenceError`** in the browser that Node
  does not reproduce. Phase 1 removes the one known cause; the
  per-barrel fresh-graph test in phase 4 catches any other regardless
  of order; the smoke test is the final word.
- **Vite dev-server module count** goes up per page load because a
  barrel pulls its whole folder. The app loads every file anyway; the
  production bundle is tree-shaken. Not a concern, noted so nobody
  re-discovers it.
- **The `legacy/` move is a large rename diff.** `git mv` keeps the
  history; the diff is nine renames and two config lines.
- **Rewrapped markup changing output.** Guarded by the byte-identical
  unit test in phase 5 before any template literal is touched.

## What the checks yielded

(Filled in as each phase lands, in the style of the earlier plans.)
