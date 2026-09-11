import { CentreSolver } from "./CentreSolver";
import { CIRCLE_FIT_MIN_DET, CIRCLE_FIT_MIN_SPAN } from "./constants";
import type { SensedContact } from "../../contact/SensedContact";
import type { CentreFit } from "./CentreFit";

/* The middle of a ring object: an algebraic circle through its feet.
 *
 * An algebraic fit — minimise the algebraic distance, which turns into a
 * two-by-two linear system and has a closed-form answer. Chosen over
 * an iterative geometric fit because it runs in a fixed number of
 * operations per frame, has no convergence to fail, and ports to Rust
 * as arithmetic rather than as a loop with a stopping rule.
 *
 * Serves the legacy ring and slot-coded kinds, which keep working
 * indefinitely. Slot-coded pucks have their feet on a ring too, so
 * they need no solver of their own; a genuinely separate
 * `CodeCentreSolver` only becomes real when printed stickers arrive,
 * which have no feet at all.
 *
 * Collinear points have no circle. The determinant guard is what
 * catches that instead of returning a centre somewhere off-screen.
 */
export class CircleFitSolver extends CentreSolver {
    override readonly id = "centre.circleFit";

    override solve(points: readonly SensedContact[]): CentreFit | null {
        const n = points.length;
        if (n < 3) return null;
        let mx = 0;
        let my = 0;
        for (const p of points) {
            mx += p.x;
            my += p.y;
        }
        mx /= n;
        my /= n;

        let sumU2 = 0;
        let sumV2 = 0;
        let sumUV = 0;
        let sumU3 = 0;
        let sumV3 = 0;
        let sumUV2 = 0;
        let sumVU2 = 0;
        for (const p of points) {
            const u = p.x - mx;
            const v = p.y - my;
            sumU2 += u * u;
            sumV2 += v * v;
            sumUV += u * v;
            sumU3 += u * u * u;
            sumV3 += v * v * v;
            sumUV2 += u * v * v;
            sumVU2 += v * u * u;
        }

        const det = sumU2 * sumV2 - sumUV * sumUV;
        if (Math.abs(det) < CIRCLE_FIT_MIN_DET) return null;

        const c1 = (sumU3 + sumUV2) / 2;
        const c2 = (sumV3 + sumVU2) / 2;
        const uc = (c1 * sumV2 - c2 * sumUV) / det;
        const vc = (c2 * sumU2 - c1 * sumUV) / det;

        const centre = { x: mx + uc, y: my + vc };
        const radiusPX = Math.sqrt(uc * uc + vc * vc + (sumU2 + sumV2) / n);

        /* Do the feet actually wrap around this circle, or are they
           strung out along a shallow arc of an enormous one? A fit
           like that has a tiny residual and is nonetheless meaningless
           — and because the residual is measured against the fitted
           radius, the more meaningless it is the better it scores. */
        if (widestGap(points) < CIRCLE_FIT_MIN_SPAN * 2 * radiusPX) {
            return null;
        }

        let sumDev = 0;
        for (const p of points) {
            const d = Math.hypot(p.x - centre.x, p.y - centre.y);
            sumDev += Math.abs(d - radiusPX);
        }
        return { centre, radiusPX, residualPX: sumDev / n };
    }
}

/* The distance between the two feet furthest apart. A handful of feet
   is a handful, so comparing every pair is cheaper than being clever
   about it. */
function widestGap(points: readonly SensedContact[]): number {
    let widest = 0;
    for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
            const a = points[i];
            const b = points[j];
            if (a === undefined || b === undefined) continue;
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d > widest) widest = d;
        }
    }
    return widest;
}
