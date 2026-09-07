import type { Point } from "./Point";

/* What one triangle says about itself -- see `describe`. */
export interface Shape {
    ring: false;
    ratios: [number, number];
    longest: number;
    /* The vertex opposite the longest side: the puck's nose. */
    anchor: Point;
    chir: 1 | -1;
    cx: number;
    cy: number;
}
