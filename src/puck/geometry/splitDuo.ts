import type { Point } from "../../types/Point";
import type { Shape } from "../../types/Shape";
import { describe } from "./describe";

export interface DuoSplit {
    big: Shape;
    small: Shape;
    score: number;
    bi: number[];
    si: number[];
}

/* Six points, split into the two triangles of the duo: a big one and a
   small one around the same centre. Returns the cleanest split, or null if
   the six don't look like a nested pair at all. */
export function splitDuo(pts: Point[]): DuoSplit | null {
    if (pts.length !== 6) return null;
    let best: DuoSplit | null = null;
    for (let i = 1; i < 5; i++)
        for (let j = i + 1; j < 6; j++) {
            const ai = [0, i, j],
                bi = [0, 1, 2, 3, 4, 5].filter((k) => !ai.includes(k));
            const da = describe(pts[ai[0]], pts[ai[1]], pts[ai[2]]);
            const db = describe(pts[bi[0]], pts[bi[1]], pts[bi[2]]);
            if (!da || !db) continue;
            const aBig = da.longest >= db.longest;
            const big = aBig ? da : db,
                small = aBig ? db : da;
            const gi = aBig ? ai : bi,
                ki = aBig ? bi : ai;
            /* The inner one fits in the hole of the outer one: smaller, but
             not so small that it could be a trembling contact point. */
            const ratio = small.longest / big.longest;
            if (ratio < 0.18 || ratio > 0.78) continue;
            /* And they share their centre; otherwise these are simply two
             pucks lying next to each other. */
            const centre = Math.hypot(big.cx - small.cx, big.cy - small.cy);
            if (centre > big.longest * 0.3) continue;
            const score = centre / big.longest;
            if (!best || score < best.score)
                best = { big, small, score, bi: gi, si: ki };
        }
    return best;
}
