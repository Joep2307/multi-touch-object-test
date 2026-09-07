import type { Point } from "./Point";

/* A contact point as recognition sees it: a real touch, or a pad of a drag
   copy from the tray. `uid` is that copy's number — points from two
   different copies never form a puck together. */
export interface TouchPoint extends Point {
    sim?: boolean;
    uid?: number;
}
