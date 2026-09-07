import type { Point } from "../../types/Point";
import type { RingShape } from "../../types/RingShape";
import { fitCircle } from "./fitCircle";
import { gapsOf } from "./gapsOf";
import { norm360 } from "./norm360";

/* Five feet on one circle: fit the circle, then read the angles from its
   centre. */
export function describeRing(pts: Point[]): RingShape | null {
    const fit = fitCircle(pts);
    if (!fit || fit.r < 1) return null;
    const angles = pts
        .map((p) =>
            norm360((Math.atan2(p.y - fit.cy, p.x - fit.cx) * 180) / Math.PI),
        )
        .sort((a, b) => a - b);
    return {
        ring: true,
        cx: fit.cx,
        cy: fit.cy,
        radius: fit.r,
        spread: fit.spread,
        angles,
        gaps: gapsOf(angles),
    };
}
