# TODO — Base architecture: contacts, traits, physicals, roles

Status: **implemented through the Phase 6 parity bridge.** The bridge
still needs validation on the physical table before it can replace the
legacy pipeline. Successor to the two design notes that were removed
from the tree (`ARCHITECTURE.md`, `ARCHITECTURE-CLASSES.md`); their
vocabulary is kept on purpose. The previous TODO — the TypeScript/wasm
conversion, finished 4 September 2026 — is archived as
`TODO-typescript-conversion.md` beside it. The layers above the Base — events,
rules, states, session, roles, presentation — are planned in
`TODO-interaction-model.md`, which supersedes phases 7 and 8 below.

Last verified on 9 September 2026: `npm run check` passes all 422 unit
tests, `npm run build` succeeds, and `npm run smoke` passes including a
simulated puck with the `?base` pipeline enabled.

## Goal

When this is done, `src/core/` holds a complete, headless model of what
lies on the glass, and it can be reasoned about, unit tested and
replayed without a table, a canvas or a DOM.

The spine is one sentence: _contact points become a `Base`; a `Base`
plus a kind is a `Physical`; a `Physical` carries a role; the role
grants functions; a mode narrows them; everything that results is
stamped with the physical that authored it._ This plan builds the first
two links completely and leaves a working, tested seam for the rest.

Nothing in the running table breaks along the way. The new model is
built **beside** the current `Track` pipeline, fed by the same
recognition output, and checked against it frame for frame. Features
move over one at a time, each in its own phase, each finished before
the next starts.

---

## Ground rules

These come from the standing project conventions and hold for every
file added below.

- TypeScript, strict. No `.js` source, no implicit `any`, no
  inference across module boundaries — every exported symbol is
  explicitly typed.
- **One symbol per file**, filename is the symbol name verbatim.
  Constants are the only exception: one `constants.ts` per folder,
  plain top-level `export const`.
- Every folder has an `index.ts` barrel. Cross-folder imports go
  through the barrel; never deep into a sibling's internals.
- 79 column line width, 4 space indent, LF, single quotes,
  semicolons.
- SCSS only for styling, modular, `@use` / `@forward`. The core
  touches no styling at all — it must compile and pass its tests with
  no DOM present.
- Rust/wasm for the hot geometry. **First TypeScript, then port** (see
  phase 9): the base maths lands in readable TS with tests, and the
  tests are what the Rust port has to keep green.
- Abstract class + registry for every noun that could ever have a
  second variant. Descriptor (data) for everything a designer rather
  than a programmer would add. Subclass when _behaviour_ differs;
  descriptor when only _configuration_ differs.
- **No number in a function body.** Every tuning value is either a
  field on a descriptor or a field on a `Policy` object. Today's
  `CFG` is dismantled into those two over the course of the plan.
- The core imports nothing from `src/state/`, `src/render/`,
  `src/ui/` or the DOM. A lint rule enforces this from phase 0, not
  from good intentions.

---

## The Base, in one picture

A `Physical` owns exactly one `Base`. The `Base` owns traits. A trait
is fed one sample per frame and answers questions about it; it holds
no opinion about what the object _means_.

```
Physical
└── Base                        the kinematic truth about one object
    ├── Position                sensed? how many feet? where is the
    │   │                       middle?
    │   └── CentreSolver        centroid | circle fit | code centre
    ├── Direction               which way does the nose point, and
    │   │                       where does that ray leave the screen
    │   └── HeadingSource       gap | slot | apex | code
    ├── Move                    from xy to xy, this frame and total
    │   └── MovePolicy          dead zone, jitter, smoothing
    ├── Rotate                  degrees turned since the last known
    │   │                       direction
    │   └── RotatePolicy        unwrap, dead zone, amplification
    ├── Tap                     how long has it been down; short
    │   │                       enough is a tap
    │   └── TapPolicy           tapMaxMS, holdMinMS, moveMaxPX
    ├── Tail                    where it has been      (derived)
    │   └── TailPolicy          maxPoints, maxAgeMS, minStepPX
    └── Acceleration            how fast it got there  (derived)
        └── AccelerationPolicy  smoothing window
```

Two tiers on purpose. `Position`, `Direction`, `Move`, `Rotate` and
`Tap` read the contact frame directly — they are the base. `Tail` and
`Acceleration` read only what the first tier already computed — they
are derived, and they are the proof that the tier boundary works: if a
derived trait ever needs the raw frame, the split is wrong and the
first tier is missing something.

### Why traits and not fields on one object

Today `Track` is one interface with 37 fields, mixing sensing (`x`,
`angle`, `conf`), UI (`ring`, `menu`, `flash`), map control (`panOX`,
`zoomCarry`) and knowledge-graph caching in one place. Every feature
that touched a puck grew a field on it. A trait is the fix: it is a
class with its own state, its own policy and its own tests, it can be
added to a kind that needs it and left off one that does not, and
nothing outside it can write to it.

---

## Class inventory

Every line below is one file, named after the symbol it exports.

### `src/core/contact/` — below the model

Nothing here knows what a puck is.

- **`ContactPoint`** — value object: id, x, y, radius, firstSeen, lastSeen
- **`ContactFrame`** — all contacts for one animation frame, plus its clock
- **`ContactSet`** — the contacts believed to belong to one object
- **`ContactSource` _(abstract)_** — where a frame comes from
- **`PointerContactSource`** — real touches on the glass
- **`SimulatedContactSource`** — the drag copies from the tray
- **`ReplayContactSource`** — a recorded frame stream, for tests

### `src/core/base/` — the base itself

- **`Base`** — the container; owns the traits, updates them in order
- **`BaseSample`** — one frame of input for the whole base
- **`BaseSnapshot`** — immutable read-only view of every trait
- **`Trait` _(abstract)_** — `id`, `update(sample)`, `reset()`, `snapshot()`
- **`TraitId`** — the union of trait ids
- **`Policy` _(abstract)_** — a swappable rule object, no loose numbers

### `src/core/base/position/`

- **`Position`** — `sensed`, `contactCount`, `centre`, `confidence`
- **`PositionSnapshot`** — the immutable answer
- **`CentreSolver` _(abstract)_** — contacts in, middle point out
- **`CentroidSolver`** — three feet → their centroid (**primary**)
- **`CircleFitSolver`** — _n_ feet on one ring → fitted centre and radius
- **`CodeCentreSolver`** — a printed/sticker pattern → its own centre
- **`PositionPolicy`** — minimum feet, confidence floor, radius tolerance
- **`PxPerMMEstimator`** — known 80 mm ÷ measured pixels → screen scale

`Position` also carries `expectedCount`, `complete` and
`fittedRadiusMM`. `sensed` is exactly what you described: true the
moment the table has the contact points it needs for this kind.
`complete` is the stricter sibling — _all_ expected feet present, not
just enough of them — and it is what tells `Presence` the difference
between "holding on through a dropout" and "fully seen".

The 80 mm ring is **not** a constant in the solver. It is
`PhysicalKind.geometry.outerDiameterMM`, so a kind with a different
ring is one descriptor entry and no code change. `CFG.ringRadiusMM`
(34 mm, the middle of the rim) moves there too.

**Decided: 80 mm is what gets drawn.** The ring on screen is sized
from the kind's `outerDiameterMM` × `pxPerMM`, never from the
measurement, so it does not breathe with sensor noise. Only the
_centre_ follows the measurement. This retires `CFG.puckRadiusMM`
(45 mm), which is why the drawn ring is currently 90 mm across on an
80 mm puck — the single biggest reason the animation and the object
do not line up today. `Position.fittedRadiusMM` stays, but only as a
recognition feature and as the input to calibration below.

**Decided: the table calibrates itself from the pucks.** `pxPerMM`
is derived today from `CFG.screenDiagIn`, a declared screen diagonal.
A puck's ring is a known 80 mm and the circle fit measures it in
pixels, so `PxPerMMEstimator` derives the true scale from the objects
on the glass and keeps refining it while the table runs. No spec to
trust, no human step before a session, and it survives a screen swap.
`CFG.screenDiagIn` becomes the seed value, not the answer.

### `src/core/base/direction/`

- **`Direction`** — `headingDeg`, `unit`, `reference`, `known`
- **`DirectionSnapshot`** — the immutable answer
- **`DirectionRay`** — the ray out to the edge; `exitPoint(bounds)`
- **`HeadingSource` _(abstract)_** — how the nose is derived from the feet
- **`GapHeadingSource`** — the widest gap in a free-angle ring
- **`SlotHeadingSource`** — the grid code's phase
- **`ApexHeadingSource`** — the apex of a triangle footprint
- **`CodeHeadingSource`** — a printed pattern's own orientation

### `src/core/base/move/`, `rotate/`, `tap/`

- **`Move`** — `from`, `to`, `deltaFrame`, `deltaTotal`, `distancePX`,
  `moving`
- **`MovePolicy`** — dead zone and smoothing (`CFG.jitterPX`,
  `CFG.smoothing`)
- **`Rotate`** — `deltaFrame`, `deltaTotal`, `turns`; see below
- **`RotatePolicy`** — unwrap window, dead zone, amplification
- **`Tap`** — `downAt`, `dwellMS`, `kind`, `movedPX`
- **`TapKind`** — `none` | `tap` | `double` | `hold`
- **`TapPolicy`** — `tapMaxMS`, `doubleGapMS`, `holdMinMS`, `moveMaxPX`

`Rotate` measures against the _previously determined_ direction, not
against an absolute zero — that is what makes "turn a bit further"
mean the same thing wherever the puck was put down. `deltaTotal` keeps
the unwrapped sum so a full turn is a full turn and not a jump from
359 to 1.

`Tap` is an interval, not an event: it reports how long the object has
been down, and `TapPolicy` decides at what threshold that reading is
called a tap. Nothing above the base gets to hardcode "300 ms".

### `src/core/base/tail/`, `acceleration/` — derived tier

- **`Tail`** — ring buffer of where the object has been
- **`TailPoint`** — x, y, angle, at
- **`TailPolicy`** — `maxPoints`, `maxAgeMS`, `minStepPX`
- **`Acceleration`** — `velocity`, `speedPXperS`, `acceleration`, `peakSpeed`
- **`AccelerationPolicy`** — smoothing window, sample count

### `src/core/physical/`

- **`Physical` _(abstract)_** — `id`, `kind`, `base`, `presence`,
  `authoredIds`
- **`TangibleObject` _(abstract)_** — on the glass, has a pose
- **`Puck` _(abstract)_** — ↳ `FilledPuck`, `OpenPuck`
- **`DuoPuck`** — composite ↳ `DuoHost`, `DuoInsert`
- **`StickerObject`** — coded, usually passive
- **`Finger`** — anonymous, transient, zone-bound
- **`HardwareControl` _(abstract)_** — ↳ `ResetButton`, `KeyboardControl`
- **`VirtualPhysical` _(abstract)_** — ↳ `SimulatedPuck`, `SystemPhysical`
- **`RemotePhysical`** — placeholder, same interface
- **`PhysicalKind`** — descriptor: footprint, geometry, affordances
- **`PhysicalRegistry`** — the live set; emits joined / left / roleChanged
- **`KindRegistry`** — all kinds, including learned ones
- **`IdentityMap`** — footprint or code → `PhysicalId` → default `RoleId`
- **`Presence`** — state machine: unseen → placed → lifted → placed | gone
- **`PresencePolicy`** — dropout memory (`CFG.dropoutMS`, `puckMemoryMS`)

### `src/core/physical/affordance/`

`PhysicalKind` also carries `defaultRole`, `cardinality` and
`appearance`; those three matter from phase 7 onwards.

`Affordance` _(abstract)_ — what the object physically permits, which
is deliberately **not** what its holder is allowed to do:
`Rotatable`, `Apertured`, `Nestable`, `Nesting`, `Opaque`, `Coded`,
`Passive`.

Keeping these apart is the single most useful line in the model:
`Apertured` says a hole-tap is _possible_, the role's `FunctionSet`
says it is _allowed_, and neither ever has to know about the other.
`mayOverlap` becomes a property of `Nestable`, so "two discs may lie
on each other" stays a physical fact.

---

## Phases

Each phase ends with the table still running and `npm run smoke`
green. No long broken middles.

**Mind the autopull.** What lands on `main` is on the table within a
minute. Phases 0–5 are safe: `src/core/` is additive and nothing
imports it, so it cannot change behaviour. Phase 6 is the first one
that runs on the glass — put the second pipeline and its overlay
behind a query flag (like `?dev`, but **not** `simMode`, which kills
the puck bar on the table) or work on a branch until parity holds.

### 0. Scaffolding and rules

- [x] `src/core/` created with barrels, importable.
- [x] `tsconfig.json`: `strict` was already on; `noImplicitOverride`,
      `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`,
      `noUnusedLocals` and `noUnusedParameters` are now on
      repo-wide. Each cost zero errors across the whole tree, so
      there was nothing to weigh.
- [x] **Done, 9 September 2026.** `noUncheckedIndexedAccess` is on
      repo-wide. It was its own piece of work, as predicted: 166 sites,
      of which most were provably in range and are now written out so
      the code says what the loop bound already knew. The rest were
      real gaps — a triangle described from three points where only two
      had arrived, a time-lapse built from an empty list of frames, a
      keyboard looked up on a side before any keyboard existed. The
      smoke test was run after, because the sweep touched recognition,
      drawing, input and speech.
- [x] **Done, 9 September 2026.** `exactOptionalPropertyTypes` is on
      repo-wide. Ten sites, every one a place where "this field is
      absent" and "this field is set to nothing" were two ways of
      saying the same thing. Fixing them also retired five `as number`
      casts in `applyShape`, where the author had had to talk the
      compiler past a check it could not see through.
- [x] **Decided against, 9 September 2026.** The `@/*` path alias is
      not being wired. The evidence is in the sentence this item
      already contained: cross-folder imports go through a barrel, so
      the chains stay short and it has not hurt. Adding it would give
      the repo two ways to write the same import, which is the thing
      this codebase spends most of its comments avoiding — and
      adopting it everywhere means rewriting some five hundred import
      lines, which costs `git blame` on every file for no behaviour
      at all. Left unwired on purpose rather than left open.
- [x] The whole source tree now compiles with `strict`; the additional
      safety flags apply to `src/core/**` through `tsconfig.core.json`.
- [x] ESLint boundary rule: nothing under `src/core/` may import from
      `src/state`, `src/render`, `src/ui`, `src/map`, or the DOM
      globals. This is the rule that keeps the core testable.
- [x] **Superseded, 9 September 2026.** The container boundary rule
      governed `functions/map-control/` and its siblings, which were
      phase 7's design and no longer exist. What replaced it is the
      rule the interaction model actually needs and which is written
      and tested: nothing under `src/core/presentation/` may import
      anything executable from `behaviour/` or `session/`. It was
      proved by breaking it deliberately and watching it fire.
- [x] Core tests live in `src/test/unit/core/`, mirroring the
      `src/core/` tree. `vitest.config.js` is **not** touched — the
      decision in its header comment stands.
- [x] Barrel-import check lives in `src/test/unit/core/barrels.test.ts`,
      not in `npm run smoke`. The smoke test starts a real Chromium and
      a real server; a barrel import needs neither, and putting it there
      would make the cheapest check in the repo the slowest.

### 1. Contacts, and a way to replay them

The whole plan is only testable if a frame stream can be captured and
played back, so that comes first.

- [x] `ContactPoint`, `ContactFrame`, `ContactSet`.
- [x] `ContactSource` and its three subclasses. `PointerContactSource`
      is fed by `down` / `move` / `up` rather than by listeners: the
      core has no DOM, so the `addEventListener` adapter lives outside
      it and gets written in phase 6 with the bridge.
- [x] `ContactRecorder` captures frames; `recordedAt` is passed in
      rather than read from the clock, so a fixture is reproducible.
- [x] The recorder is wired: `BaseSessionRecorder` captures the
      bridge's own contact frame, `installBaseHooks` gives it
      Shift+Alt+R/S/P at the table and `window.__base` on a
      laptop, both behind `?base`. A recording round-trips through
      `ReplayContactSource` with every contact intact — tested,
      because a recording that replayed differently from the
      session it came from would be worse than having none.
- [x] **Done, 9 September 2026.** Seven recordings are in
      `src/test/unit/core/fixtures/`, and they are what every
      measurement in this file since has been made against. Four of
      the six streams below are covered: a still puck, one turned a
      full circle, one slid across the table, and a palm and sleeve
      with no puck. Two are not — a foot dropping out mid-rotation and
      two pucks of the same kind brought close together — and those
      are the valuable pair, so this item is left open below.
- [ ] **Needs the table**, and only two of the six are missing: a puck
      turned while a foot drops out mid-rotation, and two pucks of the
      same kind brought close together. They are the valuable pair,
      because nothing synthetic reproduces either. Drive it with
      `?base` and Shift+Alt+R/S/P, or `window.__base` from a laptop.
- [x] `ReplayContactSource`, plus `ContactRecorder` and the
      `ContactRecording` format it writes.
- [x] Tests: 14 in `src/test/unit/core/contact.test.ts`, covering the
      simulated sources, the recorder cap, the version guard, and a
      record → replay round trip. Passing on the Mac.

### 2. Base tier one — Position and Direction

- [x] `Trait`, `Policy`, `Base`, `BaseSample`, `BaseSnapshot`, plus
      `Vec2`, `ScreenBounds` and `FootprintSpec` — the slice of a
      kind the base needs, so phases 2 to 4 can be built and tested
      before kinds exist.
- [x] `Position` + `PositionSnapshot` + `PositionPolicy`. Confidence
      is the product of three independent judgements — enough feet,
      right size for the kind, feet agreeing with each other —
      because one threshold cannot tell those three failures apart.
- [x] `CentreSolver` with `CentroidSolver` (primary) and
      `CircleFitSolver` (legacy ring and slot kinds, kept
      indefinitely). The ring diameter comes from the kind, never
      from a constant in the solver. `CodeCentreSolver` was not
      built — see the deferred item below.
- [x] `PxPerMMEstimator`: known outer diameter ÷ measured pixel
      radius → screen scale, refined while the table runs, seeded
      from `CFG.screenDiagIn`. Guard it: only trust a `complete`
      reading of a kind whose size is known, and clamp how far it
      may drift from the seed in one session.
- [x] `Direction` + `DirectionSnapshot` + `DirectionRay`, with
      `DirectionPolicy`. `known` and `headingDeg` are separate: the
      last good heading is kept when a foot drops out, so a puck
      that loses one mid-turn does not read as having spun.
- [x] `HeadingSource` with two real implementations:
      `ApexHeadingSource` (primary — the apex of the isosceles
      three-foot footprint) and `GapHeadingSource` (legacy rings).
- [x] `SlotHeadingSource`. A slot puck has no distinguished foot —
      its identity _is_ the pattern — so the heading is the rotation
      at which the measured feet line up with the code the kind
      carries. Each (foot, filled compartment) pair proposes one
      rotation, so the candidate set is small and exact rather than
      a search. `PhysicalKind.slotCode` carries the code;
      `BaseFactory` refuses a slot kind without one rather than
      falling back to `GapHeadingSource`, which would read the
      widest accidental gap and return a plausible wrong angle.
      A rotationally symmetric code returns null: it genuinely has
      several right answers and guessing makes the puck flicker.
      `CodeHeadingSource` and `CodeCentreSolver` wait for stickers —
      slot-coded pucks have feet on a ring, so `CircleFitSolver`
      already serves them and a second class would be a duplicate.
- [x] **Done, 9 September 2026**, in
      `src/test/unit/core/parity.test.ts`. The two pipelines are
      replayed frame by frame over the real recordings. The middle
      point agrees to floating-point noise, and `sensed` is true on
      every frame the old geometry could describe a triangle from and
      on none of the 467 frames of a palm and a sleeve. The heading
      does **not** agree, and that turned out to be the most valuable
      thing in the file: it is a property of the pucks rather than of
      either pipeline, and it is written up in "What the real table
      said" below.
- [x] Alignment test: `Base.outerDiameterPX` is the kind's size times
      the current scale, and the estimator walks a deliberately wrong
      seed back to the truth and clamps against a bad one.
- [x] 22 tests in `src/test/unit/core/base.test.ts`, on synthetic
      geometry whose answers can be worked out by hand. Passing on
      the Mac.

### 3. Base tier one — Move, Rotate, Tap

- [x] `Move` + `MovePolicy`, `Rotate` + `RotatePolicy`,
      `Tap` + `TapKind` + `TapPolicy`, plus
      `shortestAngleDiffDeg` beside the angle convention it uses.
- [x] `Move` smooths the centre _before_ differencing. Anything that
      differentiates raw centres — speed, acceleration — multiplies
      the sensor's noise instead of damping it, so tier two depends
      on this being right.
- [x] `Rotate` measures against the last _accepted_ heading and
      skips frames where `Direction.known` is false, so a puck that
      loses a foot mid-turn pauses instead of appearing to spin.
      `maxStepDeg` drops a step no hand could make in one frame:
      that is the heading source changing its mind about which foot
      is the nose, and without the guard one bad frame offsets the
      total forever.
- [x] `Tap` takes its interval from the contacts' own `firstSeen`
      rather than a timer it starts, so a foot flickering during a
      long hold does not restart the clock.
- [x] Numbers moved out of `CFG` into policies: `smoothing` (as an
      EMA weight, ~2/(n+1) of the old frame count), the tap and
      dwell timings. **Not** `jitterPX` — in the old code that is a
      different threshold doing a different job (separating one
      puck's feet from another's), not a stillness test.
- [x] The zoom gain deliberately did **not** move into
      `RotatePolicy`. Amplifying a turn is the zoom's opinion about
      what turning means, not a property of the turn;
      `ZoomInteraction` owns it in phase 8. A trait reports degrees.
- [x] 17 tests in `src/test/unit/core/kinematics.test.ts`. Passing on
      the Mac.

### 4. Base tier two — Tail and Acceleration

- [x] `Tail` + `TailPoint` + `TailPolicy`; bounded ring storage and
      stable snapshots avoid allocating on unchanged frames.
- [x] `Acceleration` + `AccelerationPolicy`.
- [x] Assert the tier rule in a test: both traits compile and pass
      with the raw `ContactFrame` withheld from them.
- [x] 10 tests in `src/test/unit/core/derived.test.ts`: tail respects
      `maxAgeMS`, `maxPoints` and `minStepPX`; speed of a known
      synthetic path matches the analytic answer. Passing on the Mac.
- [x] 19 seeded property tests cover geometry, headings, rays and
      scale bounds; 8 synthesised robustness tests add table-like
      noise, dropped feet, nearby objects and rejected heading jumps.

### 5. Physicals, kinds and presence

- [x] `Physical` and the subclass tree. Split by **shape**, not by
      origin: `TangibleObject` has a `Base`, `HardwareControl` is real
      but has no pose, `VirtualPhysical` produces no contacts at all.
      `SimulatedPuck` is therefore a `Puck`, not a `VirtualPhysical` —
      a drag copy really does emit contacts, which is exactly what
      makes it useful.
- [x] `PhysicalKind` descriptor; today's `state/templates`, the
      `Template` type and `TPL_FACTORY` become kind descriptors,
      unchanged in content. `defaultRole`, `cardinality` and
      `appearance` are deliberately **not** on it yet — they arrive
      with roles in phase 7, and a field nothing reads is a field that
      quietly goes wrong.
- [x] Three kind families registered side by side via `KindFamily`:
      `triad` as the standard for anything new, `ring` and `slot` as
      legacy — registered, loadable and supported indefinitely.
      `coded` exists as a name and `BaseFactory` throws for it, because
      no recogniser for printed patterns exists yet.
- [x] `Affordance` and its subclasses; `affordanceOf()` is the one
      place the question "can this object physically do X" is
      answered. `mayOverlap` now lives on `Nestable`, so it is a fact
      about objects rather than a permission.
- [x] `DuoInsert` is a modifier, not a role: it nests into a `DuoHost`
      and separates from it, and neither knows anything about
      functions.
- [x] `Presence` + `PresencePolicy`, four states with two windows:
      `holdMS` (900, today's `CFG.dropoutMS`) keeps a briefly
      unmeasured puck on the glass, `memoryMS` keeps a lifted one
      itself. Two numbers because they answer different questions;
      collapsing them gives either a flickering table or a puck that
      inherits a stranger's history.
- [x] `BaseFactory` picks solver and heading source per family, and
      **shares one `PxPerMMEstimator`** across every physical — how
      big a pixel is, is a fact about the screen, not about a puck.
- [x] `KindRegistry` (refuses duplicate ids rather than overwriting),
      `PhysicalRegistry` (announces joined / lifted / returned / left
      from `Presence`, in one place), `IdentityMap` (same kind _and_
      near the same place, which is the old `tracks.memory` rule made
      explicit).
- [x] 23 tests in `src/test/unit/core/physical.test.ts`, covering the
      presence state machine end to end, hole-versus-rim hit testing,
      the duo, registry events and both directions of the identity
      question. Passing on the Mac.

### 6. Bridge — run both pipelines side by side

The point of this phase is confidence, not features.

`src/bridge/` lives **outside** `src/core/` on purpose: it is the
one place allowed to import from both trees, which is what keeps
the core's boundary rules absolute rather than
"absolute except here". It is checked by the main tsconfig, not by
`tsconfig.core.json`.

- [x] `templateToKind` in `src/bridge/`: every one of today's
      templates becomes a `PhysicalKind`, so the two pipelines are
      provably describing the same objects before anything is
      compared. Carries the 45 mm → 80 mm outer-diameter fix.
- [x] `ParityCheck` + `ParityReport`: counts every frame the two
      disagree, on what, and by how much. Angles compared with
      `shortestAngleDiffDeg`, never subtracted — two readings either
      side of the wrap point are half a degree apart and plain
      subtraction calls that 359. Keeps the **worst** case, not the
      average: an average hides the one frame in a thousand where a
      puck jumped, and that frame is the bug.
- [x] 24 tests in `src/test/unit/bridge/`. Passing on the Mac.
- [x] `TrackBridge`: feed the existing `recognise()` output into a
      `ContactFrame`, build `Physical`s from it, and keep them
      updated alongside `tracks`. The recogniser carries the contact
      indices it chose and the tracker exposes its exact assignment;
      the bridge never tries to recognise or match the object again.
- [x] A `?base` dev overlay that draws the new model's centre, direction ray
      and tail next to the old one, so a mismatch is visible on the
      glass.
- [x] `ParityCheck`: per frame, compare centre, angle and identity
      between old and new; log divergence over a threshold.
- [ ] Run a full session on the table; drive the divergence to zero
      or write down, per case, why the new answer is the better one.
- [ ] Check the alignment on the glass: with the estimator running,
      the drawn ring should sit on the physical rim with no visible
      offset. This is the phase where the 45 mm → 80 mm change and
      the self-calibration are proven, or not.
- [ ] Only when parity holds: `Physical` becomes the source of truth
      for position and angle, and `Track` keeps only the UI fields.

### 7. Prep the layers above — seams, not features

**Superseded, 9 September 2026.** This phase and phase 8 below were
replaced by `TODO-interaction-model.md`, which builds the same layers
from the model in `resources/` instead: one grammar of trigger,
condition and effect, used by both actions and transitions, rather
than the `Function` / `Grant` / `Verdict` / `Intent` / `Command`
vocabulary sketched here. **The unticked boxes in these two sections
are not outstanding work.** What survived the change is listed under
"Carried over" in that file; phases A to F of it are done.

The sketch is kept below as it was written, because the reasoning in
it is what the replacement was argued against.

Stubs with real types and real tests, so phase 8 is wiring rather
than design.

- `src/core/roles/`: `Role` descriptor, `RoleRegistry`,
  `RoleBinding`, `Grant`, `Scope`, `Cardinality`,
  `OverflowPolicy`.
- `src/core/functions/`: `Functionality` _(abstract)_,
  `Function` _(abstract)_ splitting once into `DiscreteFunction`
  and `ContinuousFunction`; `Interaction` and `Strategy`;
  `FunctionSet` with union / intersect / subtract; `Verdict` with
  `Allowed` and `Denied(reason)` where the reason is an object
  (`NotGranted`, `OutOfScope`, `WrongMode`, `PhaseBlocked`,
  `CardinalityFull`, `TargetLocked`).
- `src/core/modes/`: `Mode`, `ModeSet`, `ModeState`, `ModeGuard`.
- `src/core/actions/`: `Intent`, `IntentRouter`, `Target` tree,
  `TargetResolver`, `ActionContext`, `Command` _(abstract)_,
  `CommandBus`, `Event`, `Journal`, `Feedback`, and `Arbiter`
  with `LastWriteWins` as the only implementation for now.
- `src/core/session/`: `Session`, `Phase`, `SessionRecord`,
  `SessionRepository`.
- `PermissionResolver`, implementing one expression:

```
effective = role.granted − role.revokes
          ∩ mode.allow
          ∩ phase.allow − phase.deny
          − suspensions
          + modifiers
```

- `ModelValidator`, run at boot and in CI: a mode never widens a
  role; every grant names something registered; `extends` has no
  cycles; every kind's footprint is separable from every other by
  more than the recognition margin; every menu function has a
  label in every language; every function lives in exactly one
  functionality.
- One end-to-end test with two throwaway roles and two throwaway
  functions, proving that a denied intent produces a `Denied`
  with a reason and no command, and an allowed one produces
  exactly one event on the journal.
- `src/core/ui/`: `MenuComposer`, which builds the ring menu from
  the physical's effective function set, and `PanelHost`, which
  binds a panel to an entity type plus the functions the holder
  has on it. Without these the roles change nothing a visitor can
  see: `ringItems()` and `openPuckRing()` would still hardcode
  the menu. Hard rule from the design notes — **no UI file names
  a role id**; if it needs to, the missing thing is a function.
- Decide what happens to `src/puck/learn/` (25 files). Learned
  templates are written at runtime, so `KindLearner` needs to
  produce `PhysicalKind` descriptors and persist them, or the
  learn flow breaks the moment kinds become descriptors.

### 8. Move features across, one at a time

**Superseded**; see phase 7 above. The same migration is phase G of
`TODO-interaction-model.md`, and it is blocked there on parity at the
physical table rather than on design.

Each item is its own commit and leaves the table working. Order is
chosen so the riskiest thing (map control) goes last.

- Storage migration **first**: saved pins on the table are
  `Pin` records in IndexedDB/localStorage. Write the `Pin` →
  `Mark` reader before anything writes the new shape, and keep
  it able to load both for one release. A session that loses its
  marks mid-afternoon is the worst failure this plan can cause.
- `mark.place` — `dropPin()` / `pins[]` become `PlaceMarkCommand`
  and `Mark` records.
- `session.settings` — the settings panel through the funnel.
- `capture.make` — photo, audio, time-lapse.
- `vote.cast` — including deciding voter identity (open question
  5).
- `map.layer` — layer menu.
- `map.navigate` and `map.zoom` — the continuous ones, as
  `Interaction` + `Strategy`, with drag and joystick as two
  strategies of the same interaction.
- `Track` deleted; nothing imports it.

### 9. Rust port of the base maths

**Blocked on the toolchain, 9 September 2026.** The specification is
ready: the TypeScript tests exist and are green, which was the
condition. What is missing is the target. `cargo` is installed and the
crate's own five tests pass natively, but `wasm32-unknown-unknown` is
not installed and `rustup` is not present to add it.

Writing the Rust without being able to build the wasm would leave the
crate and the committed `.wasm` describing different geometry, and the
whole reason the built artefact is in git is that the NUC has no Rust.
A half-ported crate that the shipped binary does not contain is worse
than an unported one. This wants a machine with `rustup target add
wasm32-unknown-unknown`.

Only after the TS tests exist and are green — they are the
specification the port must satisfy.

- [ ] Move into the existing `puck-geometry` crate: circle fit,
      centroid, gap angles, heading, angle unwrap, velocity and
      acceleration smoothing.
- [ ] Keep the boundary coarse: one call per frame with a flat
      contact buffer in and a flat base buffer out — not one call per
      trait.
- [ ] `GeometryBridge` façade in TS wraps the module; init awaited
      exactly once. Note: this crate deliberately has **no**
      wasm-bindgen — `npm run wasm` is a plain `cargo build` plus a
      copy, and the boundary is a flat C ABI with fixed buffers in
      linear memory. There is no generated code to wrap, so the
      façade owns the buffer layout itself.
- [ ] The same trait tests run against the wasm implementation.
- [ ] `npm run wasm` refreshes the committed `.wasm`; the NUC still
      builds with `npm run build` and no Rust toolchain.

### 10. Cleanup

- [ ] **Needs the table.** `CFG` is empty of behaviour: everything is
      a descriptor field or a policy field. `SettingsResolver` is
      built and tested and is what will hold them, but emptying `CFG`
      means the running table reads its numbers from the new model,
      and that waits for parity.
- [ ] **Needs the table.** `src/puck/`, `src/types/Track.ts` and
      friends removed or reduced to what the UI still owns. Nothing
      can be deleted before the thing replacing it runs on the glass.
- [x] **Done, 9 September 2026.** `ARCHITECTURE.md` is back, written
      from both plans as the system was actually built: the two
      pipelines and why there are two, the loop, the layers, the
      boundaries and what enforces them, and the two measurements from
      the table that changed the design.
- [x] **Ongoing, and kept honest.** The boxes are ticked as the work
      lands, and the two superseded phases are plain bullets rather
      than boxes so that what is left can actually be counted. As of
      9 September 2026 that is twelve: six waiting on the physical
      table, five on a Rust toolchain that cannot be installed here,
      and one on pucks to be made. This file stays in the repo.

---

## Decided

Settled on 8 September 2026, folded into the phases above.

1. **Footprint.** Three contact points is the standard for every new
   physical; `CentroidSolver` and `ApexHeadingSource` are the primary
   path. Ring and slot kinds stay registered, loadable and supported
   **indefinitely** — legacy, not deprecated. `expectedCount` still
   lives on the kind, because that is what keeps the three families
   side by side.
2. **Ring size on screen.** Drawn from the kind's `outerDiameterMM`
   (80) × `pxPerMM`, never from the frame's measurement. Retires
   `CFG.puckRadiusMM` (45), which is the current 90-vs-80 mismatch.
   `fittedRadiusMM` survives as a recognition feature only.
3. **Screen scale.** The table self-calibrates: a known 80 mm ring
   measured in pixels gives `pxPerMM`, refined while it runs.
   `CFG.screenDiagIn` is the seed, not the answer.
4. **Core tests** live in `src/test/unit/core/`; `vitest.config.js`
   is not touched.
5. **Duo insert** is a modifier on its host, not a role.
6. **Cardinality is per role.** Some roles are meant to be held by
   several physicals at once — Voter above all — so the cap is a
   field on the role descriptor, not one rule for the table.
   `Cardinality` carries `max` (absent means uncapped) and Voter
   leaves it absent.
7. **A phase narrows, never widens.** "Everyone votes now" means the
   phase denies everything except `vote.cast`; only physicals whose
   role already grants `vote.cast` can then vote. A phase can never
   hand out a function a role did not give. This keeps `effective`
   a pure intersection, which is what lets `ModelValidator` check it
   at boot instead of discovering it at the table.
8. **A voter is an identified physical**, not an anonymous finger.
   Every `CastVoteCommand` is stamped with the physical that made
   it, so double voting is impossible and per-participant analysis
   is possible afterwards. The cost is objects to hand out and
   collect — see open question 4.
9. **The journal exists from the first command.** Every command
   appends a past-tense event. Undo, session replay, the analysis
   export and any future conflict rule all fall out of it; none of
   them can be retrofitted without reopening every function.
10. **Scope for now: phases 0–6.** Contacts, the traits, physicals and
    the parity bridge — the whole Base, proven against the running
    table. Phases 7–10 stay written down but are **not** started; they
    get re-decided once parity holds.

## What the real table said (9 September 2026)

Six recordings, ~10 s each, run through the model. The first time any
of this met real data.

**What held.** The palm-and-sleeve recording is sensed as a puck on
**0 of 467 frames** — the rejection works on real noise, which is the
safety property that matters most. A still puck reads at confidence
1.00. Position, the solvers and the size check are sound.

**What did not, at the time.** Orientation. Both of the items below
have since been fixed and measured; this paragraph is kept as it was
written, because it is the evidence they were fixed against. The physical pucks measure 116/121/126
px on their sides — an apex asymmetry of **6.2%**, against a
`minApexAsymmetry` of 0.08. So `ApexHeadingSource` returned nothing at
all for a still puck: 0% heading despite 64% sensed.

Worse, and not a tuning problem: a **full circle reads as 97–203
degrees instead of 360**, at every combination of threshold and
`maxStepDeg` tried. The apex hops between feet because the true
asymmetry (6%) is close to the measurement noise (~1.6%), and each hop
is either rejected — losing the rotation under it — or accepted as a
false turn.

This is not new. `describe()` in the old pipeline picks the vertex
opposite the longest side, with the two longest differing by 4%, and
the table already carries `CFG.puckRotMaxDegS` as a rate limiter added
after "een meetsprong in de hoek zette de kaart hele niveaus uit". The
old code has been working around the same physical fact for months.

**Measured, for the record:** pxPerMM ~2.02; footprint 60 mm longest
side, centroid radius 34.6 mm, inherent spread 0.95 mm; three feet
present on only 57-64% of frames in every recording.

- [x] **Done, 9 September 2026.** `minApexAsymmetry` is 0.06. Measured
      again on all seven recordings, with the exact apex rule rather
      than an approximation of it: the still puck goes from reporting a
      heading on **none** of its 460 three-foot frames to all 460, with
      zero foot-hops. The others go from 60% to 68%, 50% to 74%, and
      33% to 84%. It costs a few more foot-hops on the pucks that are
      moving, which is affordable only because of the item below.
- [x] **Done, 9 September 2026.** `PointMatchRotationSource` matches
      this frame's feet to the previous frame's — by contact id, so a
      foot that dropped out and came back is correctly ignored — and
      solves for the rotation that best explains the difference. Two
      matched feet are enough and no nose is needed at all. **The
      recording of the full circle reads as 351.5 degrees**, where by
      apex heading it read 97 to 203 at every combination of threshold
      tried; `src/test/unit/core/rotation.test.ts` replays that
      recording and asserts it. `Rotate` now accumulates while a
      `RotationSource` decides what one frame's turn was, so this
      landed without touching anything that reads a rotation.
      `HeadingRotationSource` keeps the old behaviour and `BaseFactory`
      still chooses it for slot-coded pucks: their identity _is_ their
      pattern, so their orientation is read exactly rather than
      inferred, and an absolute reading does not drift over an
      afternoon the way accumulated relative steps do.

- [ ] **Physical, and time-sensitive if pucks are being made:** give
      the three-point footprint a markedly asymmetric layout. Measured
      again on 9 September 2026, from a different angle, in
      `src/test/unit/core/parity.test.ts`: what matters is not the
      asymmetry itself but the **margin between the two candidate
      noses**. The old geometry names the vertex opposite the longest
      side; the new one names the vertex opposite the side deviating
      most from the mean of the other two. On an isosceles footprint
      those are the same foot; on the real pucks, whose sides measure
      116, 121 and 126 px, they differ by four per cent against a
      measurement noise of 1.6% — so the two pipelines name different
      feet on 40 to 60 per cent of frames. The still puck is worse
      still: its two candidates are **1.7% apart on every frame**, a
      footprint that is very nearly equilateral. It does not flicker,
      because it is not moving; it picks one foot and holds it, which
      is the dangerous shape of this failure. It looks reliable, and
      the same puck put down again may name a different foot. The
      designed 0/132/228 footprint has a margin of **45%**, twenty-six
      times that. **The fixable half has been fixed:**
      `ApexHeadingSource` now holds its choice, so once a foot is named
      the nose it stays the nose while it is on the glass — the feet of
      a puck do not change identity while it lies there, only the
      measurement wobbles. That takes the foot-hops from six, seven and
      five per recording to none and costs nothing, the heading being
      reported on exactly as many frames as before; it is asserted on
      the real recordings in `src/test/unit/core/parity.test.ts`. **What
      remains is not a measurement that can be improved.** Across
      placements the information is simply not in the footprint: a 1.7%
      margin against a placement-to-placement error of about 1.6% is a
      coin flip, and no algorithm recovers a difference that is not
      there. Averaging does not help either, because the still puck's
      frames are pixel-identical — the ambiguity is in the shape, not in
      the noise. A margin large enough to refuse the ambiguous cases
      (0.15) silences the still puck completely, which is the same
      failure the old 0.08 threshold caused. So this last part is a puck
      to be made, not code to be written.

## Bugs found by running the code

Found on 8 September 2026 by executing the model and its adversarial
tests — none of them was visible to typecheck, lint, Prettier or review.
All are fixed.

1. **The primary pipeline was inert.** The standard three-point
   footprint was never `sensed`, so `Direction`, `Move` and `Rotate`
   were dead behind it and `PxPerMMEstimator` took zero samples in 600
   frames. `CentroidSolver`'s residual measures how far a footprint is
   from _equilateral_, and `ApexHeadingSource` requires it to be _away_
   from equilateral — the two requirements pointed in opposite
   directions, leaving a working window of roughly 8° to 11° of
   asymmetry that existed by accident. The chosen footprint (12°) sat
   just outside it. Fixed by scoring the measured spread against the
   kind's own inherent spread instead of against zero:
   `FootprintSpec.footRadiusSpreadMM`, derived by `footprintFrom()`
   using the same solver that will measure the kind at runtime.
2. **The calibrator was gated by the thing it calibrated.**
   `PxPerMMEstimator` only accepted readings above a confidence
   threshold, and confidence included the size check, which is computed
   from the scale being calibrated. A seed more than about four per
   cent off scored too low to be trusted, so every reading was ignored
   and the scale stayed wrong forever. Fixed by splitting
   `shapeConfidence` — count and shape agreement, compared as a
   dimensionless spread-to-radius ratio — out of `confidence`, and
   gating the estimator on that. A seed 11% off now corrects itself;
   before, 5% could not.
3. **Replay handed out two clocks at once.** `ReplayContactSource`
   stamped each frame with the caller's `now` while leaving every
   contact's `firstSeen` on the recording's clock. `Tap` reads dwell as
   `at - firstSeen`, so replaying a recording into a caller whose clock
   stood at 5000 reported a 4920 ms dwell on the first frame: an
   instant hold from a puck just put down. Fixed in the replay source
   rather than in `Tap`, because any trait reading contact timestamps
   would have inherited it.
4. **A rejected heading jump poisoned the next frame.** `Rotate`
   correctly refused a step larger than `maxStepDeg`, but still stored
   that rejected heading as its new baseline. The following valid frame
   was then measured from the bad reading and accumulated a false turn.
   Fixed by advancing the baseline only for accepted headings.
5. **A gone physical could revive.** `Presence` handled `sensed` before
   checking its terminal state, so a late update moved `gone` back to
   `placed` even though the registry had discarded that identity. The
   terminal guard now runs first.
6. **Lifted identity forgot where it had been.** `Position` correctly
   clears a missing measurement, but `IdentityMap` read that live value
   when deciding whether a returning puck was the same object. Tangible
   physicals now retain their last accepted centre for identity recovery.
7. **A non-finite radius poisoned calibration.** `NaN` passes ordinary
   less-than comparisons, so one invalid fitted radius could turn the
   shared `pxPerMM` value into `NaN`. The estimator now rejects all
   non-finite measurements before blending.

8. **The guard against a bad frame became a trap.** `Rotate` rejects
   a step larger than `maxStepDeg` and keeps its baseline where it
   was — right for one glitch frame, fatal for a heading that has
   genuinely moved. Pick a puck up, turn it in your hand, put it
   back, and every frame after that is a large step: rotation dies
   silently and never recovers. Measured at 50 frames of zero
   accumulation with no way back. Fixed with
   `RotatePolicy.maxRejectedFrames`: after five rejections in a row
   the baseline moves to wherever the heading now is, and the jump
   itself is still never counted as a turn.

The lesson worth keeping: every one of these passed strict TypeScript,
ESLint, Prettier and a careful read. Only execution found them, and the
first two would have been indistinguishable at the table from "the
recognition is a bit unreliable today".

## Open questions

All of these belong to phase 7 and later. None block phases 0–6, so
they can wait until the Base is standing.

1. **Overflow, for the roles that are capped.** Cardinality is
   per-role and Voter is uncapped (see Decided 10), but the capped
   roles still need a policy: put a second Supervisor puck down and
   does it take over, or is it refused? Taking over means nothing on
   the table is ever inert; refusing means the map cannot change hands
   by accident. Needed before `OverflowPolicy` is written.
2. **Mode ownership** — may a supervisor set another physical's mode,
   or only its holder?
3. **Sticker objects** — passive targets only, or can a sticker carry
   a role (a printed "voter card")? This one got sharper with
   Decided 12: if every voter needs an identified physical, a printed
   card is the cheap way to have twenty of them.
4. **How many voter pucks does a session need?** Not a code question,
   but it decides whether Decided 11 and 12 work together in a room.
   A phase that narrows to `vote.cast` only lets physicals vote that
   already hold the function, and voters are now identified physicals
   — so the number of voter objects is the number of people who can
   vote. Twenty visitors means twenty objects.

## Out of scope

- Any change to how recognition itself decides _which_ kind a
  footprint is. The matchers keep working exactly as they do; only
  where their answer goes changes.
- The knowledge graph, speech and capture services. They keep their
  current shape and are called _by_ commands.
- Kiosk, autopull, reset key and the NUC deployment.
- Remote devices (`RemotePhysical`) beyond existing as a name.
- Undo, arbitration beyond `LastWriteWins`, and multi-table sync —
  all of them are seams here, none of them are built.
