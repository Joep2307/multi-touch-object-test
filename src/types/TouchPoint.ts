import type { Point } from "./Point";

/* A contact point as recognition sees it: a real touch, or a pad of a drag
   copy from the tray. `uid` is that copy's number — points from two
   different copies never form a puck together.

   `id` is what makes the same foot recognisable from one frame to the
   next. For a real touch it is the browser's pointer id; for a simulated
   pad it comes from `simContactId`, out of the negative half of the number
   line so the two can never collide. Recognition itself works on plain
   x/y, but holding a puck on two feet is a statement about *which* feet,
   and a position alone cannot say that. */
export interface TouchPoint extends Point {
    id: number;
    sim?: boolean;
    uid?: number;
}
