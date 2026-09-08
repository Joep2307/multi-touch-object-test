import { NOISE } from "../../config/NOISE";
import type { NoiseFoot } from "../../types/NoiseFoot";
import type { Point } from "../../types/Point";

/* Which contact point belongs to which foot: the nearest anchor within
   `MATCH_MM`, each point used once. Returns the index per foot (-1 for a
   foot nothing was found for) and `drift`: how far the matched points have
   moved from their anchors, as one direction and distance in millimetres.

   Two mistakes are avoided by measuring it exactly this way. Against the
   centroid of all the points it would fail on a foot that drops out --
   losing one of six shifts that centroid further than a nudge of the puck
   does. And as an average of distances it would grow with the noise
   itself: at two millimetres of scatter every point already lies three and
   a half millimetres from its anchor, while the puck has not moved at all.
   Averaged as a vector, the scatter cancels and only real movement is
   left. */
export function matchFeet(
    feet: NoiseFoot[],
    pts: Point[],
    pxPerMM: number,
): { pick: number[]; drift: number; hits: number } {
    const k = pxPerMM || 1;
    const used = new Set<number>();
    const pick: number[] = [];
    let dx = 0,
        dy = 0,
        hits = 0;
    for (const f of feet) {
        let bi = -1,
            bd = NOISE.MATCH_MM * k;
        for (let i = 0; i < pts.length; i++) {
            if (used.has(i)) continue;
            const d = Math.hypot(pts[i].x - f.ax, pts[i].y - f.ay);
            if (d < bd) {
                bd = d;
                bi = i;
            }
        }
        pick.push(bi);
        if (bi >= 0) {
            used.add(bi);
            dx += pts[bi].x - f.ax;
            dy += pts[bi].y - f.ay;
            hits++;
        }
    }
    return {
        pick,
        drift: hits ? Math.hypot(dx, dy) / hits / k : Infinity,
        hits,
    };
}
