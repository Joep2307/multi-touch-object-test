import type { Point } from "./Point";

/* One foot of a puck, remembered with the contact id the glass gave it.

   Where a puck's feet are is not enough to hold on to it: a finger that
   lands where a foot was looks exactly like that foot. Which feet they are
   is the part that cannot be faked, and that is the id. */
export interface TrackFoot extends Point {
    id: number;
}
