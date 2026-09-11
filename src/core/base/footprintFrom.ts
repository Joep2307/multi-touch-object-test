import type { SensedContact } from "../contact";
import type { FootprintSpec } from "./FootprintSpec";
import type { Vec2 } from "./Vec2";
import type { CentreSolver } from "./position";

/* Derive a kind's size numbers from where its feet actually are.
 *
 * The important part is the `solver` argument. A kind's expected
 * measurements are produced by **the same solver that will measure it
 * at runtime**, so the two are comparable by construction rather than
 * by someone remembering which radius a given solver reports. That is
 * the whole bug this function exists to prevent: a spec written by
 * hand as "half the outer diameter" against a solver that reports the
 * mean distance from the centroid, which differ by enough to make a
 * perfectly good puck score zero.
 *
 * Feet are given in millimetres, in any coordinate frame — only their
 * arrangement matters.
 */
export function footprintFrom(
    feetMM: readonly Vec2[],
    outerDiameterMM: number,
    solver: CentreSolver,
): FootprintSpec {
    const points: SensedContact[] = feetMM.map((foot, i) => ({
        id: i,
        x: foot.x,
        y: foot.y,
        radiusPX: 0,
        firstSeen: 0,
        lastSeen: 0,
    }));
    const fit = solver.solve(points);
    return {
        expectedCount: feetMM.length,
        footRadiusMM: fit === null ? 0 : fit.radiusPX,
        footRadiusSpreadMM: fit === null ? 0 : fit.residualPX,
        outerDiameterMM,
    };
}
