import type { SimPuck } from "./SimPuck";

/* A drag copy attached to the mouse: dragging, or rotating with Shift/right
   mouse button. */
export interface MouseDrag {
    puck: SimPuck;
    rotate: boolean;
    ox: number;
    oy: number;
    r0: number;
    a0: number;
    t0: number;
    px: number;
    py: number;
    rot0: number;
}
