# TODO — hold a puck on two feet, and the serious bugs

Status: **planned, nothing built.** Written 11 September 2026 from a
full review of the tree. Every automated gate passed at the time —
`npm run check`, `npm run build`, `npm run smoke`, `npm run wasm:test`,
460 unit tests — and none of the items below was visible to any of
them. The two earlier plans (`TODO.md` on the Base and
`TODO-interaction-model.md` on the layers above it, plus the archived
TypeScript conversion) are finished and were removed with this file;
they are in git history at commit `d6f21d2`, and `ARCHITECTURE.md`
describes what they built.

This is one list, in the order the work should go. Part 1 is a change
of design and is the reason the list exists. Part 2 is the serious
bugs the review found, each a small fix with a test. The two overlap:
three of the bugs in part 2 disappear once part 1 is built, and they
are marked as such rather than fixed twice.

---

## Ground rules

Same as the plans before it.

- TypeScript, strict, both configs. One symbol per file, filename is
  the symbol. Constants in one `constants.ts` per folder. Every folder
  has an `index.ts` barrel.
- 79 columns, 4 spaces, LF. Comments say _why_, in the language the
  file already uses.
- No number in a function body. Every tuning value is a field on a
  policy (`src/core/`) or on `CFG` (`src/puck/`).
- Nothing in `src/core/` touches the DOM or imports from the app tree.
  `src/bridge/` is the only place allowed to import from both
  pipelines.
- Every fix ships with the test that would have caught it. A bug that
  was found by reading gets a test that fails before the fix and
  passes after; a bug found on a recording gets that recording
  replayed in the test.
- Both pipelines get the same behaviour. The old one runs the table;
  the new one is checked against it frame by frame in
  `src/test/unit/core/parity.test.ts`. A hold that only one side does
  shows up there as a divergence, and is not done.

---

## Part 1 — Hold a puck on two feet

### What the table does now

A puck is three feet. The old recogniser (`src/puck/geometry/
recognise.ts`) finds triangles out of triples; with two feet on the
glass there is no triple, no detection, and the track goes unseen.
`track()` then holds it at its **last** position for `CFG.dropoutMS`
(and, because of bug 2.1 below, currently for one frame instead), with
no idea whether it moved. The ring and grid pucks already have a hold
path in `recognise` — four feet instead of five, `held: true`, at
lower confidence — the triangle does not.

The new pipeline is worse off, not better. `TrackBridge` feeds the
physical whatever contacts the old detection names, so on a two-foot
frame it feeds **nothing** (`TrackBridge.ts:125`). And even fed the two
feet directly, `PositionPolicy.minFeet` is 3, so `Position` reports
not sensed; `Move` resets (`Move.ts:49`), `MotionHistory` and
`Acceleration` reset behind it, `Tap` loses its start centre
(`Tap.ts:58`), and a swipe through one dropout frame never fires.
`Presence` holds the identity for 900 ms, which is right, but the
kinematics stop dead.

How often this happens is the measured fact that decides the design:
**three feet are present on only 57 to 64 per cent of frames in every
one of the seven recordings** made at the table on 9 September 2026
(`src/test/unit/core/fixtures/contacts-table-*.json`). A dropout is
not an edge case. It is a third of every session.

### The rule

**Whatever started with three feet stays that puck while two of those
feet are still recognisably there.** Not two feet of anything: two
feet whose contact ids the table has been watching since the last
complete frame, still the same distance apart. Then the two remaining
feet say exactly how the puck moved and turned, and where the third
foot must be.

Two matched points fix a rigid motion in the plane completely:
rotation is `atan2` of the cross over the dot of the centred pairs
(the two-point case of what `PointMatchRotationSource` already
solves), translation is what is left. Apply that motion to the last
known position of the missing foot and the footprint is whole again —
two real feet, one reconstructed. Everything that reads a footprint
(centre, heading, displacement) reads it as usual and does not need to
know.

Three things the rule does not do, on purpose:

- It never **establishes** a puck on two feet. There has to have been
  a complete, sensed frame first. Two fingers are never a puck.
- It never guesses across a gap. If fewer than two of the watched ids
  are there, the frame is a pause (`null`), as today, and `Presence`
  keeps the identity. A foot that comes back has a new id and is not
  matched to whichever old foot is nearest.
- The reconstruction is always **reference → now**, never frame →
  frame. The reference is the last complete frame; the held frames do
  not become references. So a puck held for five seconds does not
  drift by five seconds of accumulated error.

A finger landing where a foot was is refused by the rigidity check:
the two matched feet must still be within `rigidTolerance` of their
reference distance. Noise is 1.6% (measured); the tolerance starts at
5% and is tuned on the recordings.

### In the new pipeline — `src/core/`

The completion happens **before the traits**, in one place, so every
tier-one trait sees three feet and none of them learns about holding.

- [ ] `src/core/contact/SensedContact.ts`: add
      `reconstructed?: boolean`. Absent means real.
- [ ] `src/core/base/FootprintCompletion.ts` (new, one class): holds
      the reference — a map of contact id → position from the last
      frame that was complete and sensed — and one method,
      `complete(contacts, spec)`, that returns the same set, the set
      plus reconstructed feet, or the set untouched when it cannot
      help. Its own policy `FootprintCompletionPolicy`:
      `minMatchedFeet` 2, `rigidTolerance` 0.05, `maxGapMS` 70 (same
      reasoning as `RotatePolicy.maxGapMS`: a reference older than
      four frames is not worth matching, and a driver that reuses ids
      must not be credited with a motion nobody made).
- [ ] `Base.update`: run the completion first and hand the completed
      set to the traits in `BaseSample`. Refresh the reference after
      `Position` has run, and only from a frame that was complete and
      sensed on **real** feet.
- [ ] `PositionSnapshot`: add `held: boolean` — any reconstructed foot
      in the set. `Position` scales confidence by
      `PositionPolicy.heldConfidence` (0.6 to start) on held frames,
      and `complete` stays false: a held puck is sensed but not whole.
- [ ] `PxPerMMEstimator.observe`: ignore held frames. A reconstructed
      foot carries the scale it was reconstructed with, and feeding
      it back would be the loop the Base comment warns about.
- [ ] `PointMatchRotationSource`: skip reconstructed points when
      matching. They are rigidly derived from the real ones, so
      including them changes nothing and excluding them keeps the
      source honest about what it measured.
- [ ] `ApexHeadingSource`: the reconstructed foot keeps its id, so the
      held nose stays the nose through a dropout. Check that it does;
      this is also what bug 2.5 needs.
- [ ] `PhysicalInstance` / `InstanceStatus`: surface `held` so the
      render plan can draw a held puck differently (the old table
      draws `incomplete` at 35% alpha; the new one should say the
      same thing for the same reason).

### In the old pipeline — `src/puck/`

Mirror the ring's hold, for triangles.

- [ ] `TouchPoint`: add `id: number`. `frame.ts:53` builds the list
      from `touches.real`, whose keys are pointer ids; carry them.
      Simulated pads get the id the bridge already derives for them
      in `trackBridgeContacts`, so both pipelines name the same foot
      by the same number.
- [ ] `Detection`: add `contactIds` beside `contactIndices`.
- [ ] `Track`: remember `feet` — the last complete triple as
      `{id, x, y}[]`, updated in `track()` from every non-held
      triangle detection.
- [ ] `recognise`: after the triangle and ring searches and before
      returning, for every tracked triangle puck without a detection
      this frame: find which of `t.feet` ids are among the unused
      points; need two; check the pair distance against the reference
      pair within `CFG.holdRigidTol`; solve the rigid motion;
      reconstruct the third; `describe()` the three; emit a
      `Detection` with `held: true`, `conf: 0.4`, and
      `contactIndices` of the **two real** feet only. The bridge then
      feeds the core two real feet and the core reconstructs on its
      own, which is the point: two independent reconstructions that
      must agree.
- [ ] `track()`: a held detection keeps the track `recognised`, moves
      it and turns it. The normal triple search runs first, so the
      moment a third contact lands where the reconstructed foot is,
      the ordinary path takes over and the track's `feet` are
      refreshed.
- [ ] `drawPuck`: draw a held puck the way `incomplete` is drawn.

### Tests

- [ ] `kinematics.test.ts`: a 300 px drag with one two-foot frame in
      the middle fires `swipe` and reports the full `deltaTotal`; the
      same drag with the dropout at the start (feet landing staggered)
      is not a tap; a turn through a dropout accumulates the full
      angle; the reconstructed foot lies within 3 px of where the real
      foot reappears.
- [ ] `base.test.ts`: two fingers never establish a puck; a finger
      replacing a foot at the wrong distance is refused; a reference
      older than `maxGapMS` is not used; a held frame does not move
      `pxPerMM`.
- [ ] `parity.test.ts` on the seven recordings: sensed frames go from
      57–64% of all frames to (very nearly) all frames with two or
      more of the watched feet; the full-circle recording still reads
      about 351.5 degrees; the palm-and-sleeve recording is still
      sensed on 0 of 467 frames. Both pipelines report a centre on
      the same frames, and the centres agree within the tolerance the
      test already uses.
- [ ] A recognise test in `src/test/unit/`: a triangle that loses a
      foot is held with the right centre and angle, and two unrelated
      touches near a lifted puck are not.

### Decided

- Reconstruct rather than lower `minFeet` to 2. A two-foot centroid is
  not the puck's centre and a two-foot footprint has no nose, so
  every trait downstream would need a special case. One reconstruction
  and no special cases.
- One place, before the traits, rather than inside `Position`. The
  heading source reads the raw frame too, and it would otherwise need
  the same code.
- The hold has no time limit of its own while two feet are matched.
  `Presence.holdMS` is about zero feet; this is about two, and a puck
  held on two feet for a minute is still that puck.

---

## Part 2 — Serious bugs

Confirmed by reading and, where marked, by running the code. Ranked.
File references are as of commit `d6f21d2`.

### 2.1 The dropout hold is dead in the old pipeline

`src/puck/track.ts:121-123`. The final `else` deletes any track that
is not `recognised`, which includes `incomplete`. Frame N+1 unseen:
`recognised → incomplete`. Frame N+2 unseen: deleted, after 32 ms
instead of `CFG.dropoutMS` 900. Nothing goes to `tracks.memory`, so
the puck comes back fresh with no marker and no topic. This is a
regression from the module split: `app.ts:2302-2308` had fixed exactly
this, with a comment saying so, and the port dropped it.

- [ ] `else if (t.state === "candidate") tracks.map.delete(id);`
- [ ] Test: a recognised track unseen for ten frames is still there,
      `incomplete`; unseen for longer than `dropoutMS` it is in
      `tracks.memory` and gone from the map; a `candidate` unseen
      once is gone at once.
- [ ] Part 1 makes this fire far less often (a two-foot frame is no
      longer a dropout), but a zero-foot frame still needs it.

### 2.2 Learned ring and grid pucks vanish on reload

`src/puck/saveOwnPucks.ts:10-16` writes only `ratios` and `longestMM`;
`src/puck/restoreOwnPucks.ts:20-26` refuses any entry whose `ratios`
is not a two-element array. A puck learned in the puck stand as a ring
or grid code is saved without `ratios` and dropped on the next reload,
and `ownSeq` is not advanced. `saveTemplates.ts:6-9` describes fixing
this same bug for the fixed list.

- [ ] `saveOwnPucks` writes through `tplWire`, `restoreOwnPucks`
      reads through `applyShape`, so the three shapes share one
      serialisation.
- [ ] Test: round-trip a triangle, a ring and a grid own puck through
      the two functions with a stubbed `localStorage`.

### 2.3 A drag reads as a tap when the press begins on fewer feet

`src/core/base/tap/Tap.ts:58-63`. `#startCentre` is assigned only on
the frame `#downAt` is first set; if `Position` had no centre on that
frame it stays `null` for the whole press and `movedPX` stays 0.
Verified: one foot on frame 0, three feet dragged 240 px, release at
220 ms → `{dwellMS: 220, movedPX: 0}` and the recogniser emits `tap`.

- [ ] Take the start centre from the first frame that has one, not
      from the first down frame.
- [ ] Test as above. **Resolved by part 1 for the two-foot case**, but
      the one-foot landing still needs this.

### 2.4 One missing-foot frame wipes `Move`

`src/core/base/move/Move.ts:49-52` resets whenever position is not
sensed; `MotionHistory` and `Acceleration` reset behind it; the swipe
is lost because `from`/`to` are null on the stop frame. Verified: a
300 px drag with one two-foot frame fires no swipe and reports
`deltaTotal` `{0, 0}`.

- [ ] **Resolved by part 1.** No separate fix: the reset is right for
      a lift, and once a two-foot frame is a sensed frame it is no
      longer a lift. Keep the kinematics test from part 1 as the
      regression test for this.

### 2.5 The held nose is dropped on any below-threshold frame

`src/core/base/direction/ApexHeadingSource.ts:86-89`. A frame whose
asymmetry dips under `minApexAsymmetry` sets `#chosen = null`, and the
next frame re-picks from scratch — which is exactly what the hold was
added to prevent (`DirectionPolicy.ts:12-19`: real pucks sit at 6%
against the 0.06 threshold). Verified: headings 0 → null → **240** on
three consecutive frames; without the middle frame, 0 → 0.

- [ ] Keep `#chosen` through a below-threshold frame; report `null`
      for that frame only. Clear it when the chosen id leaves the
      contact set (the foot lifted) — which part 1 makes rare.
- [ ] Test as above, plus the parity assertion on the recordings that
      foot-hops stay at zero.

### 2.6 Slow turns are never counted

`src/core/base/rotate/Rotate.ts:71-72`. A step within the 0.4° dead
zone is added as zero, so a turn slower than 24°/s at 60 fps never
accumulates. Verified: 0.3° per frame for 300 frames — a real 90°
turn over five seconds — reports `deltaTotalDeg` 0.

- [ ] Accumulate every step; the dead zone gates only `turning` and
      `deltaFrameDeg`. Noise is zero-mean and the gesture threshold
      is what decides whether a turn means anything.
- [ ] Test as above, and a still puck with ±0.3° noise for 300 frames
      stays within 2° of zero.

### 2.7 Transitions on source-less events can never fire

`src/core/behaviour/StateMachineRunner.ts:70-71` returns `null` when
`event.sourceId` is null. `mode.changed` has no source, nor do timers
started by mode effects, nor `custom.menu.*`. The shipped programme's
`puck.votedToReady` (`Voted → Ready` on `mode.changed`,
`exe/public/programmes/participation.json:352`) is therefore dead: a
puck that voted and is carried into `Results` or `Paused` stays
`Voted`, red, with `open_note` as its only action. The validator's
own error text ("so this rule can never fire") is exactly the case it
misses (`validateProgramme.ts:393-401`).

- [ ] Decide what a source-less event means to a machine: run the
      transition for **every** instance the machine governs. That is
      what `mode.changed` wants and what a session-wide timer wants.
- [ ] Validator: refuse a transition whose trigger can never carry a
      source unless the machine is declared to handle broadcast
      events, or accept and document the broadcast rule. Either way,
      no silent dead rule.
- [ ] Test: the shipped programme, vote, change mode to `Results`,
      assert `Ready`.

### 2.8 Queue promotion never reaches the physical

`src/core/runtime/Runtime.ts:117-125` calls `session.roles.departed`
directly on `left`, bypassing `Session.assignRole` and with it
`#reconcileRoles`. The promoted object's `roleId` stays `null` until
some unrelated `mode.changed` happens to reconcile again. Verified.
Three neighbours in the same ledger:

- [ ] Route the departure through `Session` so it reconciles.
- [ ] `RoleAssigner.#release` (`:143-152`) does not promote the queue;
      `departed` (`:137`) does. Make them the same.
- [ ] `Runtime.#offerRole` (`:259-283`) re-offers on every
      `mode.changed` and `physical.detected`, and a queued object has
      `roleId === null`, so it is released and re-queued at the back
      each time. Skip objects that are already queued.
- [ ] `Session.assignRole` (`:192-199`) ignores
      `eligiblePhysicalKinds`; only `#offerRole` checks. Check in the
      ledger, once.
- [ ] Tests: max 1 / queue with a, b, c; a departs → b holds and
      `instance("b").roleId === "Mic"` on the next frame; a is
      reassigned elsewhere → b holds; a mode change does not reorder
      b and c; a rule cannot hand a role to an ineligible kind.

### 2.9 A swallowed test

`src/test/unit/core/runtime.test.ts:255`. The comment opened there
closes at 268, so "never arms a puck that was never in the voting
area" has the body of the test below it and its own body never runs.
Vitest counts 13 tests in the file, not 14.

- [ ] Close the comment. Then find out whether the never-arms test
      passes — it has not run since it was written.
- [ ] `:352-362` "counts votes from two pucks separately" creates one
      puck. Give it two.

### 2.10 The recorder is bound to dead objects after an error

`src/render/frame.ts:87-95`. The catch nulls `baseBridge`,
`parityCheck` and `baseRuntime` but not `baseRecorder`, which was
built once with the old two. After one caught error every later
recording captures the frozen `contactFrame` of the dead bridge:
thousands of byte-identical frames, and the parity summary reads a
counter nobody updates. The recording's own comment says a recording
that replays differently from its session is worse than none.

- [ ] Null the recorder too, and rebuild the hooks — or give the
      recorder a way to be re-pointed. Nulling is simpler.
- [ ] Test in `recorder.test.ts`: after the bridge is replaced, the
      next capture reads the new bridge.

---

## Parked

Found in the same review, real, not in this list. Each is a line so
it is not lost with the old plans; none blocks the table.

- Audio-only recordings become unreachable after any note re-render
  (`stopTalk.ts:15` nulls the pin `renderTalk.ts:14` checks).
- Theme labels go into `innerHTML` unescaped in
  `renderAnalytics.ts:105`; `renderRecent` escapes.
- Overlapping semantic searches duplicate rows in
  `renderMatches.ts:15-27`.
- `deploy/update.sh:73` reads the "before" commit after the previous
  run's reset, so a failed `npm ci` is never retried.
- Recording truncates silently at 3600 frames; `BaseSessionRecorder`
  never reads `droppedCount`.
- The duo's kind is frozen at its first bootstrap measurement
  (`TrackBridge.ts:213-229`), so the two pipelines diverge on it.
- Parity "frames compared" counts comparisons, not frames, and keeps
  counting after the recording stops.
- `installBaseHooks`: the Shift+Alt shortcuts match `e.key`, which
  macOS composes into another character, so they cannot fire there.
- `drawPuck` ignores the duo's smaller radius, so nested pucks paint
  over each other; hit-testing and drawing disagree.
- `exportCsv` leaves the topic column unquoted.
- `transcribe.py:167` strips trailing newline bytes from audio.
- Dead SCSS selectors for the tray in `_dock.scss:91-107`; `kgInfo`
  clamped at 280 px against a 375 px panel.
- Heat overlay and bake assume north-up (`drawGaps.ts`, `bakeMap.ts`).
- Unquoted paths in the generated systemd units.
- Log note ids collide once the log is full (`Session.ts:264`); a
  scoped setting without `scopeId` outranks global
  (`SettingsResolver.ts:74-79`); `[0, 360]` heading range matches
  almost nothing; the validator throws instead of reporting on a
  missing `geometry` or `physicalPresentations`, and refuses two slot
  kinds that differ only by code.
- `IdentityMap.resolve` can hand back a puck that is being sensed
  right now; `ReplayContactSource` lets `firstSeen` drift by up to
  one recorded frame; `Presence` stamps `lifted` with the noticing
  frame, not the deadline.

---

## Order of work

1. 2.9 and 2.1 first: two one-line changes, and 2.9 may reveal a
   failing test that changes the picture.
2. Part 1 in the core, with its tests, replayed on the recordings.
3. Part 1 in the old pipeline, then the parity test across both.
4. 2.3, 2.5, 2.6 — the remaining kinematics, each now easy to test
   with the two-foot fixtures in place.
5. 2.7 and 2.8 together: both are the behaviour layer, both need the
   shipped programme as the test.
6. 2.2 and 2.10.

Verify after each step: `npm run check`, then `npm run smoke`.
