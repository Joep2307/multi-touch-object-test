import type { Point } from "./Point";

/* How a rigid body moved between two frames: a turn about the middle of
   the points that were matched, and the shift of that middle.

   Two matched points fix this completely, which is the whole reason a puck
   can be held on two feet. */
export interface RigidMove {
    /* The turn, in radians. */
    rot: number;
    /* The middle of the matched points, before and after. */
    from: Point;
    to: Point;
}
