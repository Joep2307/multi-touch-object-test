# TODO — hold a puck on two feet, and the serious bugs

Status: **built, 11 September 2026.** Every item of parts 1 and 2 is
in the tree with the test that would have caught it, and every gate
passes: `npm run check` (561 tests) and `npm run smoke`. What the plan
said to do is in git; what follows is what was actually built, and the
three places where the plan's own numbers turned out to be wrong.

The Parked list at the bottom is still open. Nothing in it blocks the
table.

---

## What was built

### Part 1 — a puck holds on while two of its feet are down

Whatever started with three feet stays that puck while two of those
feet are still recognisably there — two feet whose contact ids the
table has been watching since the last whole frame. Those two say how
the puck moved and turned, and where the third foot must be. The
footprint is whole again, and everything that reads one reads it as
usual.

In the core, `FootprintCompletion` (`src/core/base/`) does this before
any trait runs, from `Base.update`, so no trait learns that holding
exists. `SensedContact.reconstructed` marks the worked-out foot;
`PositionSnapshot.held` reports it; `PositionPolicy.heldConfidence`
discounts it; `PxPerMMEstimator` and `PointMatchRotationSource` skip
it, each for its own reason. `rigidMotionBetween` is now shared
between the completion and the rotation source rather than written
twice.

In the old pipeline, `TouchPoint` carries a contact id at last — the
pointer id for a finger, a negative `simContactId` for a simulated pad
— and `recognise` holds a triangle on two of them, mirroring what the
rings and grids already did on four. `Track.feet` is the reference,
refreshed only from a whole detection. A held detection hands the
bridge the **real** feet only, so the new pipeline reconstructs the
third itself: two independent reconstructions that have to agree.

### Part 2 — the bugs

All ten, each with its test. 2.4 needed no separate fix: once a
two-foot frame is a sensed frame it is no longer a lift, and `Move`'s
reset is right for a lift.

---

## Three things the plan got wrong

Worth keeping, because each was found by measuring rather than by
reading, and each changed the design.

**The recordings are not short of feet; they are short of pucks.**
"Three feet are present on only 57 to 64 per cent of frames" is
arithmetically right and misleading. Most of the shortfall is an empty
table. On the still puck, 238 of 717 frames have no contacts at all
and only 7 have two; genuine two-foot dropouts across the seven
recordings run from none to 82 frames. So the hold is worth every
dropout there actually is, not the third of a session the plan
expected. Asserted in `parity.test.ts` so the claim cannot drift back.

**`maxGapMS` was answering the wrong question, and contradicted the
plan's own rule.** The policy said a reference older than four frames
is not worth matching; the Decided section said the hold has no time
limit while two feet are matched. Both cannot be true, and at 70 ms
the feature was nearly inert — 6 of 82 dropout frames on the recording
that needed it most. What `maxGapMS` was standing in for is "are these
the same touches", and `firstSeen` answers that exactly. There is now
no time limit and an exact continuity check.

**A lifted foot moves the ones that stay.** `rigidTolerance` is 0.15,
not 0.05. On `contacts-table-122` a pair 133.3 px apart with three feet
down reports 119 to 127 px for as long as only two are — a lasting ten
per cent shrink, because tilting the puck moves the blobs the driver
reports. At five per cent that recording held 14 of its 82 two-foot
frames; at fifteen it holds all 82, and the centre it hands back when
the third foot returns is _closer_ (4.8 px against 12.8). The plan
also had the tolerance doing a job it does not do: what refuses a
finger landing where a foot was is the contact **id**, since a new
touch is a new id. The tolerance is the sanity check behind that, and
can afford to be generous because the check in front of it is exact.

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

The order of work the plan laid out was followed as written.
