import type { SimPuck } from "../types";

/* What counts as a tap: touched briefly, barely moved, and barely rotated —
   that way dragging and rotating stay just dragging and rotating. */
export function wasTap(g: {
    puck: SimPuck;
    t0: number;
    px: number;
    py: number;
    rot0: number;
}): boolean {
    return (
        performance.now() - g.t0 < 400 &&
        Math.hypot(g.puck.x - g.px, g.puck.y - g.py) < 10 &&
        Math.abs(g.puck.rot - g.rot0) < 0.08
    );
}
