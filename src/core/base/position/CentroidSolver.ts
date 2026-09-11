import { CentreSolver } from "./CentreSolver";
import type { SensedContact } from "../../contact";
import type { CentreFit } from "./CentreFit";

/* The middle of a three-foot object: the centroid of its feet.
 *
 * This is the primary solver, and not merely because it is the
 * simplest. A circle fitted through exactly three points passes
 * through all three *exactly*, so its residual is always zero — for
 * any three points at all, including three unrelated fingers. That
 * makes it useless as a quality signal for the one kind of object we
 * are standardising on. The centroid keeps a usable signal: the three
 * distances vary in a way that is fixed by the shape, so a measured
 * spread that differs from the shape's own spread means these points
 * are not that object.
 *
 * Note the "differs from the shape's own spread". The spread is **not
 * zero** for a three-point puck: the footprint is deliberately not
 * equilateral, because an equilateral one has no distinguishable
 * apex and therefore no readable orientation. `FootprintSpec`
 * carries the expected spread for exactly this reason, and
 * `footprintFrom()` derives it with this same solver.
 */
export class CentroidSolver extends CentreSolver {
    override readonly id = "centre.centroid";

    override solve(points: readonly SensedContact[]): CentreFit | null {
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
