# The table measures its own screen

The scale that turns millimetres into pixels comes from
`CFG.screenDiagIn`, a number somebody typed in. Measured against the
seven recordings of 9 September 2026 it is **2.24 % low**: the feet of
a three-foot puck sit on a circle of 70.11 px (median of 1633 readings
from four recordings), which at the declared 2.0169 px/mm reads as
34.76 mm where the rim centre line is 34.00. The declared diagonal of
43 in behaves like 42.06 in.

At that error an 80 mm puck is drawn 1.8 mm small across, so the ring
lies inside the physical rim all the way round. Correcting
`puckRadiusMM` to 40 and `PUCK_HOLE` to 0.7 removed the 4 mm error;
this plan removes what is left, and removes the typed-in number as a
thing anyone has to get right.

## What it should do

A puck of a known size is a ruler lying on the glass. The fit already
measures it in pixels and the build drawing says what it is in
millimetres, so the screen can be asked to state its own scale instead
of being told. It must survive a window resize, a second screen and a
reload, and it must never be able to talk itself into nonsense.

## Decisions

**Learn a factor, not a scale.** The state is `k`, the ratio between
the measured scale and the one the screen's own size implies, and
`view.pxPerMM = seed × k`. A resize recomputes the seed from the new
window; `k` carries over untouched, because a screen that was 2 % bigger
than declared is still 2 % bigger in a smaller window. Storing the
absolute scale instead would be wrong the moment the window changed,
which is exactly the responsiveness being asked for.

**Anchor the clamp to the seed, never to the last answer.** `k` is
clamped to ±12 %, the same guard and the same number as
`PxPerMMPolicy.maxDrift` in the core. An estimator anchored to its own
previous value can walk anywhere given enough frames.

**Only the build drawing may calibrate.** A learned template's
millimetres were themselves computed from `view.pxPerMM`, so feeding one
back would make the scale confirm itself. `learnedAt` and `duoSeen` are
the two marks that say "measured here", and both disqualify a reading.

**One reading is worth 2 %.** Sixty frames a second arrive and none of
them is urgent; the same `smoothing` as the core uses.

**Incomplete readings do not count.** A puck held alive on four feet has
a circle fitted through fewer points than it has, so `held` detections
carry no reading at all. Below `minConf` the shape is not a puck we are
sure of, and it is ignored.

## Files

| File                             | What                                          |
| -------------------------------- | --------------------------------------------- |
| `src/config/SCALE.ts`            | new — smoothing, maxDrift, minConf, minMM     |
| `src/types/ScaleReading.ts`      | new — one known length: `px`, `mm`, `conf`    |
| `src/state/scale.ts`             | new — `seed`, `k`, `samples`                  |
| `src/puck/scale/readScale.ts`    | new — template + measured shape → reading     |
| `src/puck/scale/syncPxPerMM.ts`  | new — `view.pxPerMM = seed × k`               |
| `src/puck/scale/observeScale.ts` | new — gate, blend, clamp, store               |
| `src/puck/scale/saveScale.ts`    | new — `k` to localStorage                     |
| `src/puck/scale/restoreScale.ts` | new — and back again                          |
| `src/types/Detection.ts`         | add `scale?: ScaleReading`                    |
| `src/puck/geometry/recognise.ts` | attach the reading to each detection          |
| `src/puck/track.ts`              | feed the reading once the track is recognised |
| `src/map/resize.ts`              | set the seed, then sync                       |
| `src/main.ts`                    | restore before the first resize               |
| `src/config/CFG.ts`              | `screenDiagIn` is a seed now, not the truth   |
| `src/test/unit/scale.test.ts`    | new — the guards, not the arithmetic          |

## Phases

Each phase leaves the table running.

1. **State and arithmetic.** `SCALE`, `ScaleReading`, `scale`,
   `syncPxPerMM`, `observeScale`, `readScale`, with unit tests. Nothing
   calls them yet, so the table behaves exactly as before.
2. **Wiring.** `Detection` carries the reading, the recogniser fills it,
   `track` feeds it, `resize` seeds it. The scale now corrects itself
   within a session.
3. **Persistence.** Save and restore `k`, restore before the first
   resize. A table that has seen a puck once starts calibrated for
   every session after.

## Verification

- Unit tests: a reading corrects the scale; a run of bad readings cannot
  move it past the clamp; a learned template is refused; a `held`
  detection carries nothing; a resize keeps `k` and changes `pxPerMM`.
- Against the recordings: replay a fixture and assert the learned `k`
  lands within a fraction of a per cent of the 2.24 % the measurement
  found by hand.
- On the glass: this is the one that matters, and it needs a puck.

## Open

- The seed stays `CFG.screenDiagIn`, still typed in, and still what the
  clamp is anchored to. A wildly wrong diagonal (a 24 in screen declared
  as 43) is outside ±12 % and the table cannot correct it. That is the
  intended failure: a calibrator that accepts anything is not a guard.
- The core's `PxPerMMEstimator` does this per object and will replace
  this once it draws. Same policy numbers on purpose, so the two agree
  when the parity check compares them.
