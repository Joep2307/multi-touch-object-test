import type { RingShape } from "./RingShape";

/* A ring read as a grid code: the same circle as a `RingShape`, plus which
   of the `slots` compartments the feet fall into. `phase` is where the grid
   starts on the glass in degrees, `idx` the slot per measured foot (same
   order as `angles`), `code` those slots as a bit mask, `snap` how far the
   feet sit from the middle of their slot on average -- a handful of
   fingers never snaps to a grid -- and `dup` how many feet ended up
   sharing a slot, which a real puck never does. */
export interface SlotShape extends RingShape {
    slots: number;
    phase: number;
    idx: number[];
    code: number;
    snap: number;
    dup: number;
}
