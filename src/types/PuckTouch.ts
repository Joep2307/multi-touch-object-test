import type { Point } from "./Point";
import type { SimPuck } from "./SimPuck";

/* One grip on a drag copy: one finger slides, two fingers rotate only.
   Each held puck has its own grip, so two hands can move two pucks at the
   same time. */
export interface PuckTouch {
    puck: SimPuck;
    ptrs: Map<number, Point>;
    t0: number;
    px: number;
    py: number;
    rot0: number;
    baseRot?: number;
    dx?: number;
    dy?: number;
    baseAngle?: number;
}
