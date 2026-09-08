import { CentreSolver } from "./CentreSolver";
import type { ContactPoint } from "../../contact/ContactPoint";
import type { CentreFit } from "./CentreFit";

/* The middle of a three-foot object: the centroid of its feet.
 *
 * This is the primary solver, and not merely because it is the
 * simplest. A circle fitted through exactly three points passes
 * through all three *exactly*, so its residual is always zero — which
 * makes the residual useless as a quality signal for the one kind of
 * object we are standardising on. The centroid does not have that
 * problem: the feet of a three-point puck are equidistant from the
 * centre by construction, so the spread of those three distances is a
 * real measurement of whether this is one object or three fingers.
 *
 * That is the whole argument for `CentroidSolver` over
 * `CircleFitSolver` on three points, and it is why the choice of
 * solver belongs to the kind rather than to a count.
 */
export class CentroidSolver extends CentreSolver {
    override readonly id = "centre.centroid";

    override solve(points: readonly ContactPoint[]): CentreFit | null {
        const n = points.length;
        if (n < 3) return null;
        let sx = 0;
        let sy = 0;
        for (const p of points) {
            sx += p.x;
            sy += p.y;
        }
        const centre = { x: sx / n, y: sy / n };
        let sumR = 0;
        for (const p of points) {
            sumR += Math.hypot(p.x - centre.x, p.y - centre.y);
        }
        const radiusPX = sumR / n;
        let sumDev = 0;
        for (const p of points) {
            const d = Math.hypot(p.x - centre.x, p.y - centre.y);
            sumDev += Math.abs(d - radiusPX);
        }
        return { centre, radiusPX, residualPX: sumDev / n };
    }
}
