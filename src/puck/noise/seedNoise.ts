import { noise } from "../../state";
import type { Point } from "../../types";

/* Start over: these points are the new anchors, and the series settles for
   a moment before it starts counting. */
export function seedNoise(pts: Point[], now: number): void {
    noise.phase = "hold";
    noise.t0 = now;
    noise.frames = 0;
    noise.slip = 0;
    noise.extra = 0;
    noise.snapSum = 0;
    noise.snapN = 0;
    noise.radii = [];
    noise.codes = new Map();
    noise.feet = pts.map((p) => ({
        ax: p.x,
        ay: p.y,
        n: 0,
        sx: 0,
        sy: 0,
        sxx: 0,
        syy: 0,
        miss: 0,
    }));
}
