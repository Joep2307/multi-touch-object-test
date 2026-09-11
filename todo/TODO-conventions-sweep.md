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
- **A file imports files from its own folder and from any folder above
  it; everything else goes through the target's barrel.** Found in
  phase 4; see there.
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

Found here, fixed in phase 7: nothing called `cancelCapture`. Not a
conversion slip — `legacy/app.ts` never called `cancelAll` either, so
the function has been waiting for its call since it was written.

## Phase 3 — One symbol per file

**Done 11 September 2026.**

- [x] The 13 files split. Two departures from the sketch, both to
      follow rules this plan already states: `TPL_KEY` and `OWN_KEY`
      are constants, so they went into a new `src/puck/constants.ts`
      rather than a file each; `DuoSplit` is a type, so it joined the
      others in `src/types/`. The rest are next to their main symbol:
      `Phrase.ts` in `types/`, and in `src/core/` `SettingsQuery.ts`,
      `OverflowDecision.ts`, `LoadResult.ts`, `RegionUpdate.ts`,
      `SignatureMatch.ts`, `RuleTraceEntry.ts`, `EffectType.ts`,
      `ConditionSubjectType.ts`, `FootprintScore.ts`. Each companion
      took its own comment along; the essays stayed with the main
      symbol.
- [x] The six core barrels point at the new files; single-line
      `export type` runs in them are kept alphabetical.
- [x] The ten consumer files import from the new files. The compiler
      then named nine type imports the three originals no longer
      used, and those are gone.
- [x] Check: tsc (repo and core), lint, spell, 494 unit tests and
      `npm run build` green.

## Phase 4 — Barrels for the app tree

**Done 11 September 2026.** 30 barrels rather than 29: `src/puck/scale/`
arrived in the tree while this plan was being written. 488 files had
their imports rewritten, 78 of them a second time (see the first
finding below). The rewriter and its companion live in the session
scratchpad, not the repo; the tests below are what outlive them.

Three things the build learned that the sketch did not know:

1. **An import up the tree stays a file import.** The sketch had every
   cross-folder import going through a barrel, including a child
   importing its parent (`from ".."`). The first test run showed why
   that cannot hold: `direction/Direction.ts` importing `Trait` from
   `..` while `base/index.ts` re-exports `./direction` is a cycle by
   construction, and `class Direction extends Trait` reads `Trait` at
   evaluation time — the one top-level read the audit's scan had not
   looked for. The subclass evaluated first and its base was
   `undefined`. So the rule is: a barrel is for outsiders; inside a
   folder, and from a folder into any folder above it, files import
   files. `conventions.test.ts` states the exception in those words.
2. **Where an import lands is the target's own barrel**, not the
   nearest ancestor's. `render/frame.ts` imports `../puck/geometry`,
   `../puck/learn` and `../puck` as three statements, not one
   `../puck`. That is what the core tests already did
   (`../../../core/events`), it keeps fan-in small, and it makes the
   `export *` lines in `puck/index.ts` and `ui/index.ts` a
   convenience rather than a load-bearing part. They are kept because
   `core/index.ts` does the same.
3. **`parity.test.ts` belongs to the bridge, not the core.** It
   compares the Base pipeline with the legacy `describe`, which is
   exactly what `src/bridge/ParityCheck` exists for. Under the core
   typecheck (`lib: ES2022`, no DOM) its one reach into the app tree
   now pulled the whole `types` barrel in through `describe.ts`, DOM
   types included. Moved to `src/test/unit/bridge/`, where
   `bridge.test.ts` already lives, it needs no exception.

- [x] The 30 barrels, written from the import graph: a barrel lists
      what something outside the folder imports; `src/types/` lists
      every type, since a type barrel has nothing to hide and nothing
      to load. Values, then `export *` for sub-barrels, then the
      `constants` group, then `export type` lines, each run
      alphabetical.
- [x] Every import rewritten to the rule above, merged one statement
      per barrel, `import type` in its own statement, value
      statements before type statements, each run sorted by
      specifier. Files with no cross-folder change were left alone.
      `src/i18n/L.ts` came out as one 41-column line and needed no
      hand-formatting.
- [x] Three files renamed after their symbol on the way, all found by
      the new test: `state/chip.ts` → `CHIP.ts`,
      `puck/geometry/layout.ts` → `LAYOUT.ts` (the two Rust doc
      comments and the console message that name it updated), and a
      pre-existing one in the core, `behaviour/TriggerMatcher.ts` →
      `matchesTrigger.ts`. `puck/scale/saveScale.ts` carried a
      `SCALE_KEY` beside its function, the phase-3 pattern; it went
      into `puck/scale/constants.ts`.
- [x] `src/test/unit/barrels.test.ts`: each of the 30 barrels imported
      first in a fresh module graph under Node, plus the
      no-work-at-import-time timing on the three biggest.
- [x] `src/test/unit/conventions.test.ts`: barrels exist; a
      cross-folder import resolves to a directory unless it goes up
      the tree; one export per file, named after the file. Its first
      run found the `TriggerMatcher` rename above and nothing else.
- [x] Check: 539 unit tests, tsc (repo and core), lint, spell,
      `npm run build`, `npm run smoke` green.

Not typechecked at the time: the unit tests outside
`src/test/unit/core/`. `tsconfig.json` excludes `src/test` and
`tsconfig.core.json` includes only the core tests, and Vitest
transpiles without checking. Closed in phase 7.

## Phase 5 — 79 columns

**Done 11 September 2026.** 145 lines, not the 231 the audit counted:
the barrels of phase 4 shortened every long `import` line on their own,
and the decorative rules turned out to be inside the count only because
the audit measured bytes where the rule measures characters — a `═` is
three bytes and one column.

The order was: strings and markup first, behind a verifier; then the
prose; then the two lines Prettier itself produces too long.

- [x] **A verifier rather than a spot check.** Before touching a single
      literal, every `.ts` file was copied aside. A script parses both
      versions with the TypeScript compiler's own parser and folds each
      `+` chain of string and template literals into the sequence of
      static text and expressions it produces — recursively, so a
      literal split inside an interpolation folds too, and ignoring the
      whitespace and trailing commas Prettier moves around. A literal
      only broken across lines therefore compares equal and one whose
      value moved does not. All 18 files with a string or a piece of
      markup in them came back identical. The script stayed in the
      session scratchpad: it answers a question this phase asked once.
- [x] Strings and markup (66 lines): the demo texts in `DEMO_PINS.ts`
      and the two prompts in `buildQuestion.ts` became adjacent-string
      concatenation broken at a space; tile and font URLs in
      `TILE_SETS.ts`, `loadFonts.ts` and `onSearchKeydown.ts` broke at a
      `/` or a `?`; the HTML template literals in `sheetCard.ts`,
      `renderLearn.ts`, `ownPuckList.ts`, `drawLearnPoints.ts`,
      `renderRecent.ts`, `renderAnalytics.ts` and `renderKeyboard.ts`
      broke at tag and attribute boundaries.
- [x] Comment prose (53 lines): block comments and `//` runs reflowed
      to 79, keeping their own continuation indent. Seven trailing
      comments on code lines — `CFG.ts`, `kg.ts`, `MV.ts` ×3,
      `noteToPin.ts`, `endTrayDrag.ts`, `makeDraggable.ts` — moved above
      the line they explain rather than being squeezed.
- [x] Test names (8 lines): the `it("…")` sentences split at a space.
- [x] The two lines Prettier produces at exactly 80 columns and will
      not break itself:
      the named `export` of `ReplaceLowestPriorityOverflow` from its own
      file became `export *` — the file holds one symbol, so it names
      exactly the same thing, with a comment saying why this one line
      is not in the barrel's usual style. In `_note.scss` the note's opening
      easing became a `$note-open-ease` variable, which is shorter at
      the call site and gives the overshoot the name a comment would
      otherwise have had to give it.
- [x] `exe/styles/base/_tokens.scss` needed nothing: its three long
      lines were gone before this phase reached them.
- [x] The width check joined `conventions.test.ts`, counting characters
      rather than bytes, over `src/**/*.ts` **and**
      `exe/styles/**/*.scss`. `src/i18n/L.ts` is the one exemption and
      is named in the test with the reason from `.prettierignore`;
      `exe/index.html` is not scanned.
- [x] Check: `npm run check` (561 tests) and `npm run build` green.
      Smoke was not needed — nothing here changes a module's behaviour,
      and the verifier is a stronger statement about the markup than a
      click-through would be.

## Phase 6 — Documentation and configuration

**Done 11 September 2026.**

- [x] `README.md`: the tree gains `capture/`, `legacy/`, `core/` and
      `bridge/`, and the `src/` line now reads "Eén symbool per bestand,
      een index.ts per map". A new section, _Hoe de boom in elkaar zit_,
      states the three checked rules and the fourth habit — nothing does
      work at import time — and names the tests that hold them.
- [x] `ARCHITECTURE.md`: the headless-core section says which two of its
      habits now hold for the whole tree, including the import-up-the-tree
      exception and why it exists; the layer rules gain "nothing anywhere
      in `src/` does work at import time except `src/main.ts`".
- [x] `todo/TODO.md`: the barrel ground rule names the exception and
      points here.
- [x] `tsconfig.core.json`: the stale "existing 489 files" opening
      rewritten — `tsconfig.json` has had `noUncheckedIndexedAccess` and
      `exactOptionalPropertyTypes` since 9 September, so what is left in
      that file is the DOM-free `lib`/`types` boundary and nothing else.
      The duplicated paragraph about `lib` went with it.
- [x] `vitest.config.js`: done in phase 1, re-read here.
- [x] `.vscode/settings.json`: nothing to change. Its ruler is already
      79, its formatter already Prettier, and its note about
      `.prettierignore` is still true — that file now names `legacy/`
      where it used to name eight root files.
- [x] `project-words.txt`: one new Dutch word.
- [x] Final: `npm run check`, `npm run build` and `npm run smoke` green.

## Phase 7 — The two things the sweep uncovered

Not planned. Both came out of the work above, and both were left open
when the six phases finished. **Done 11 September 2026.**

### `cancelCapture` was never called

The capture module has had a "stop everything" since it was written,
with a comment saying what it is for: when a session is wiped or
reset, nothing may keep running. Nothing ever called it — not the
module split, and not `legacy/app.ts` before it, which exported
`cancelAll` and never used it either.

What that cost at the table: a recording begun at two o'clock kept
running straight through "clear everything", and delivered a quarter
of an hour later a film of a session nobody could place any more.

- [x] `src/ui/onWipe.ts` calls `cancelCapture()` on the second tap,
      the one that actually wipes. Stopping is deliberately not
      discarding — the recorder hands over what it has and
      `wireCapture` saves it, because a wipe at the end of an
      afternoon should not cost the film.
- [x] `doReset` needs nothing: it ends in `location.reload()`, which
      takes the recorder with it. Adding a call there would only look
      symmetrical; the asynchronous stop could not finish before the
      page went away.
- [x] `src/test/unit/capture.test.ts` — five tests, under jsdom: the
      time-lapse timers are cleared, the buttons are told so the clock
      stops, a running recorder is asked to stop rather than dropped,
      nothing running is a no-op, and the wipe path end to end.
      Checked against the unfixed `onWipe`: the last one fails, the
      other four pass.
- [x] `cancelCapture` joined the `src/capture/` barrel, which until now
      exported only `wireCapture` — the rest of the folder had no
      reader outside it.

### The tests were not typechecked

`tsconfig.json` excludes `src/test`, `tsconfig.core.json` includes only
the core tests, and Vitest transpiles without checking. So every test
outside `src/test/unit/core/` was unchecked, and a fixture could drift
from the type it claimed to be with nothing to say so.

- [x] `tsconfig.test.json`: `src/test`, with `node` added to `types`
      (the tests read fixtures off the disk and the smoke test starts a
      server) and `resolveJsonModule` for the recorded contact
      fixtures. Wired into `npm run check` as `typecheck:test` and into
      CI as its own step. `@types/node` is a new devDependency, the
      first one this repo has needed.
- [x] It found 124 errors on the first run. Four were real:

`bridge.test.ts` and `recorder.test.ts` each build a `Detection` with no
`feet`, a field that has been required since the bridge started measuring
objects from the actual feet. Both fixtures now derive `contactIndices`
and `feet` from one list of contacts, so the two cannot drift apart.

`bridge.test.ts` gave a `Template` a numeric `learnedAt` where the type
says an ISO date string, behind an `as Template` cast that existed to
silence exactly this. The cast is gone.

`scale.test.ts` passed `{ angles: undefined, ringMM: undefined }` to build
a triangle, which leaves both keys present holding undefined — what
`exactOptionalPropertyTypes` was turned on to catch. A triangle now has
its own builder.

`smoke.ts` block 6 collected the page's JS errors and never asserted on
them, alone among the twelve blocks. The unused-binding error is what
noticed; the assertion is now there, and it passes.

- [x] The rest were `noUncheckedIndexedAccess` on array indexing, which
      the tests inherit from `tsconfig.json` and keep. Two helpers say
      the assumption once instead of at every site: `src/test/unit/at.ts`
      (the element at `i`, or a failure naming the index) and
      `threePoints.ts` (the three feet of a triangular puck). Where a
      list has a known length the type now says so — the four blueprint
      pucks are a 4-tuple whose `ratios` are required, the four drop
      spots in the smoke test are `[number, number][]`.
- [x] In the smoke test, `document.getElementById(...)` inside a
      `page.evaluate()` callback is cast, the way `src/dom/el.ts` casts
      for the same reason: a missing id is a mistake in `index.html` and
      is allowed to fail hard. The callback is serialised and cannot
      close over `el`, so the cast is written out at each site.
- [x] One bug of my own, caught by the same config: `setInterval` in
      `src/capture/` returns a `Timeout` under Node's types and a number
      in the browser, and the module typed its timers as `number`. They
      are `ReturnType<typeof setInterval> | null` now, which is what
      `src/state/talk.ts` already used.
- [x] Check: `npm run check` (566 tests, four typecheck passes),
      `npm run build`, `npm run smoke` green.

---

## Verification, per phase

| Phase | check | build | smoke | extra                            |
| ----- | ----- | ----- | ----- | -------------------------------- |
| 1     | yes   | yes   | yes   | first frame draws after initView |
| 2     | yes   | yes   | yes   | record button, no-mic message    |
| 3     | yes   | yes   | —     | typecheck:core                   |
| 4     | yes   | yes   | yes   | barrels + conventions tests      |
| 5     | yes   | yes   | —     | literal-identity verifier        |
| 6     | yes   | yes   | yes   | —                                |
| 7     | yes   | yes   | yes   | the fix fails without the change |

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
