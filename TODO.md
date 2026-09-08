# TODO — Base architecture: contacts, traits, physicals, roles

Status: **plan only, no code written yet.** Successor to the two design
notes that were removed from the tree (`ARCHITECTURE.md`,
`ARCHITECTURE-CLASSES.md`); their vocabulary is kept on purpose, so the
words in this plan mean the same things they did there. The previous
TODO — the TypeScript/wasm conversion, finished 4 September 2026 — is
archived as `TODO-typescript-conversion.md`.

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
- [ ] `tsconfig.json`: `strict` on, plus `noUncheckedIndexedAccess`,
      `exactOptionalPropertyTypes`, `noImplicitOverride`,
      `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, and the
      `@/*` path alias for `src/*`.
- [ ] Turn strict on for `src/core/**` first if the existing tree
      does not survive it in one go; record what still fails.
- [ ] ESLint boundary rule: nothing under `src/core/` may import from
      `src/state`, `src/render`, `src/ui`, `src/map`, or the DOM
      globals. This is the rule that keeps the core testable.
- [ ] ESLint boundary rule: no file under a container folder imports
      from a sibling container — only from its own folder, the
      resolver, and services.
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
- [ ] **Needs the table.** Wire the recorder to a dev-only button and
      record the six real streams below into
      `exe/public/fixtures/frames/`, then copy the ones tests use into
      `src/test/unit/core/fixtures/`. Until then the only fixture is
      `threePointPlaceRotateLift.json`, which is **synthetic** — a
      generated three-foot puck, good enough to prove replay works and
      not good enough to prove recognition does.
- [x] `ReplayContactSource`, plus `ContactRecorder` and the
      `ContactRecording` format it writes.
- [ ] Record at least: one puck placed and lifted; one puck rotated a
      full turn; one puck panned across the table; a foot dropping
      out mid-move; two pucks at once; a hand resting on the glass.
- [x] Tests: 17 in `src/test/unit/core/`, covering the pointer and
      simulated sources, the recorder cap, the version guard, and a
      record → replay round trip. **Not yet run** — vitest needs the
      Mac (see below).

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
- [ ] `SlotHeadingSource` waits for phase 6: it needs the slot count
      and code from real template data, which the bridge supplies.
      `CodeHeadingSource` and `CodeCentreSolver` wait for stickers —
      slot-coded pucks have feet on a ring, so `CircleFitSolver`
      already serves them and a second class would be a duplicate.
- [ ] **Needs the table.** Tests on _recorded_ fixtures: middle point
      within tolerance of the value
      the current `fitCircle` produces; heading within tolerance of
      the current `describeRing` / `describeSlots` angle; `sensed`
      flips exactly when the current pipeline gains and loses the
      puck.
- [x] Alignment test: `Base.outerDiameterPX` is the kind's size times
      the current scale, and the estimator walks a deliberately wrong
      seed back to the truth and clamps against a bad one.
- [x] 30 tests in `src/test/unit/core/base.test.ts`, on synthetic
      geometry whose answers can be worked out by hand. **Not yet
      run** — vitest needs the Mac.

### 3. Base tier one — Move, Rotate, Tap

- [ ] `Move` + `MovePolicy`, `Rotate` + `RotatePolicy`,
      `Tap` + `TapKind` + `TapPolicy`.
- [ ] Move the relevant numbers out of `CFG` into those policies:
      `jitterPX`, `smoothing`, the tap and dwell timings, the zoom
      gain. `CFG` keeps only what is genuinely per-installation.
- [ ] Tests: a full turn reads 360 and not 0; a rotation across the
      wrap point is continuous; jitter below the dead zone does not
      register as a move; a 120 ms contact is a tap and an 800 ms one
      is a hold; lifting mid-rotation cancels rather than half
      applies.

### 4. Base tier two — Tail and Acceleration

- [ ] `Tail` + `TailPoint` + `TailPolicy`.
- [ ] `Acceleration` + `AccelerationPolicy`.
- [ ] Assert the tier rule in a test: both traits compile and pass
      with the raw `ContactFrame` withheld from them.
- [ ] Tests: tail respects `maxAgeMS` and `minStepPX`; speed of a
      known synthetic path matches the analytic answer.

### 5. Physicals, kinds and presence

- [ ] `Physical` and the whole subclass tree.
- [ ] `PhysicalKind` descriptor; today's `state/templates`, the
      `Template` type and `TPL_FACTORY` become kind descriptors,
      unchanged in content.
- [ ] Three kind families registered side by side: the 3-point kind
      as the standard for anything new, and the ring and slot kinds
      as legacy — registered, loadable and supported indefinitely,
      not deprecated. Existing pucks never stop working.
- [ ] `Affordance` and its subclasses; `isToolPuck()` and
      `mayOverlap()` become affordance queries.
- [ ] `DuoInsert` is a **modifier**, not a role: while nested it
      adds or swaps functions on the host and removes them on
      separation. `mayOverlap` stays a physical fact on `Nestable`.
      Decided — do not give the insert a role of its own.
- [ ] `Presence` + `PresencePolicy`; `TrackState` and the dropout
      memory move here.
- [ ] `PhysicalRegistry`, `KindRegistry`, `IdentityMap`.
- [ ] Tests: a puck lifted and put back within the memory window is
      the same `PhysicalId` with its authored records intact; after
      the window it is a new one.

### 6. Bridge — run both pipelines side by side

The point of this phase is confidence, not features.

- [ ] `TrackBridge`: feed the existing `recognise()` output into a
      `ContactFrame`, build `Physical`s from it, and keep them
      updated alongside `tracks`.
- [ ] A dev overlay that draws the new model's centre, direction ray
      and tail next to the old one, so a mismatch is visible on the
      glass.
- [ ] `ParityCheck`: per frame, compare centre, angle and identity
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

**Deferred.** Not started until phases 0–6 are done and the open
questions below are answered. Written out here so the Base is built
with the right seams, not so it gets built now.

Stubs with real types and real tests, so phase 8 is wiring rather
than design.

- [ ] `src/core/roles/`: `Role` descriptor, `RoleRegistry`,
      `RoleBinding`, `Grant`, `Scope`, `Cardinality`,
      `OverflowPolicy`.
- [ ] `src/core/functions/`: `Functionality` _(abstract)_,
      `Function` _(abstract)_ splitting once into `DiscreteFunction`
      and `ContinuousFunction`; `Interaction` and `Strategy`;
      `FunctionSet` with union / intersect / subtract; `Verdict` with
      `Allowed` and `Denied(reason)` where the reason is an object
      (`NotGranted`, `OutOfScope`, `WrongMode`, `PhaseBlocked`,
      `CardinalityFull`, `TargetLocked`).
- [ ] `src/core/modes/`: `Mode`, `ModeSet`, `ModeState`, `ModeGuard`.
- [ ] `src/core/actions/`: `Intent`, `IntentRouter`, `Target` tree,
      `TargetResolver`, `ActionContext`, `Command` _(abstract)_,
      `CommandBus`, `Event`, `Journal`, `Feedback`, and `Arbiter`
      with `LastWriteWins` as the only implementation for now.
- [ ] `src/core/session/`: `Session`, `Phase`, `SessionRecord`,
      `SessionRepository`.
- [ ] `PermissionResolver`, implementing one expression:

```
effective = role.granted − role.revokes
          ∩ mode.allow
          ∩ phase.allow − phase.deny
          − suspensions
          + modifiers
```

- [ ] `ModelValidator`, run at boot and in CI: a mode never widens a
      role; every grant names something registered; `extends` has no
      cycles; every kind's footprint is separable from every other by
      more than the recognition margin; every menu function has a
      label in every language; every function lives in exactly one
      functionality.
- [ ] One end-to-end test with two throwaway roles and two throwaway
      functions, proving that a denied intent produces a `Denied`
      with a reason and no command, and an allowed one produces
      exactly one event on the journal.
- [ ] `src/core/ui/`: `MenuComposer`, which builds the ring menu from
      the physical's effective function set, and `PanelHost`, which
      binds a panel to an entity type plus the functions the holder
      has on it. Without these the roles change nothing a visitor can
      see: `ringItems()` and `openPuckRing()` would still hardcode
      the menu. Hard rule from the design notes — **no UI file names
      a role id**; if it needs to, the missing thing is a function.
- [ ] Decide what happens to `src/puck/learn/` (25 files). Learned
      templates are written at runtime, so `KindLearner` needs to
      produce `PhysicalKind` descriptors and persist them, or the
      learn flow breaks the moment kinds become descriptors.

### 8. Move features across, one at a time

Each item is its own commit and leaves the table working. Order is
chosen so the riskiest thing (map control) goes last.

- [ ] Storage migration **first**: saved pins on the table are
      `Pin` records in IndexedDB/localStorage. Write the `Pin` →
      `Mark` reader before anything writes the new shape, and keep
      it able to load both for one release. A session that loses its
      marks mid-afternoon is the worst failure this plan can cause.
- [ ] `mark.place` — `dropPin()` / `pins[]` become `PlaceMarkCommand`
      and `Mark` records.
- [ ] `session.settings` — the settings panel through the funnel.
- [ ] `capture.make` — photo, audio, time-lapse.
- [ ] `vote.cast` — including deciding voter identity (open question
      5).
- [ ] `map.layer` — layer menu.
- [ ] `map.navigate` and `map.zoom` — the continuous ones, as
      `Interaction` + `Strategy`, with drag and joystick as two
      strategies of the same interaction.
- [ ] `Track` deleted; nothing imports it.

### 9. Rust port of the base maths

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

- [ ] `CFG` is empty of behaviour: everything is a descriptor field
      or a policy field.
- [ ] `src/puck/`, `src/types/Track.ts` and friends removed or
      reduced to what the UI still owns.
- [ ] `ARCHITECTURE.md` rewritten from this plan as it was actually
      built, and kept.
- [ ] Boxes above checked off; this file stays in the repo.

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
