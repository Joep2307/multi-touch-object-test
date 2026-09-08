import type { Point } from "../../types/Point";
import type { SlotShape } from "../../types/SlotShape";
import { codeOf } from "./codeOf";
import { describeRing } from "./describeRing";
import { slotOf } from "./slotOf";
import { slotPhase } from "./slotPhase";
import { slotResidual } from "./slotResidual";

/* Feet on one circle, read as a grid code. First the circle and the angles
   (that is what `describeRing` already does), then the grid: where it
   starts, which slot each foot falls into, and how neatly they fall.

   Unlike the ring of five, the number of feet is free here -- that is the
   point of a code. What has to be true is that they snap to the grid:
   `snap` is the average distance to the middle of a slot, and a hand
   resting on the glass never gets that below a few degrees. `dup` counts
   feet that ended up in the same slot, which no printed puck does. */
export function describeSlots(pts: Point[], slots: number): SlotShape | null {
    const ring = describeRing(pts);
    if (!ring) return null;
    const phase = slotPhase(ring.angles, slots);
    const idx = ring.angles.map((a) => slotOf(a, phase, slots));
    let snap = 0;
    for (const a of ring.angles)
        snap += Math.abs(slotResidual(a, phase, slots));
    return {
        ...ring,
        slots,
        phase,
        idx,
        code: codeOf(idx),
        snap: snap / ring.angles.length,
        dup: ring.angles.length - new Set(idx).size,
    };
}
