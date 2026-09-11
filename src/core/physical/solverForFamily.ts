import { CentroidSolver, CircleFitSolver } from "../base/position";
import type { CentreSolver } from "../base/position";
import type { KindFamily } from "./KindFamily";

/* Which solver reads this family's feet.
 *
 * One function rather than a method on `BaseFactory`, because two
 * places need the answer and they must not be able to differ:
 * `BaseFactory` measures the object at runtime, and `signatureFrom`
 * works out what a perfect example of it would measure. A signature
 * derived with one solver and measured by another is the bug that made
 * the standard three-point footprint score zero — the expected numbers
 * and the measured ones were two different quantities.
 */
export function solverForFamily(family: KindFamily): CentreSolver {
    switch (family) {
        case "triad":
            /* Three points always fit a circle exactly, so a circle
               fit's residual would be a constant zero and tell us
               nothing. The spread of the foot distances does, because
               the feet are equidistant by design. */
            return new CentroidSolver();
        case "ring":
        case "slot":
            return new CircleFitSolver();
        case "coded":
            throw new Error(
                "No recogniser exists for printed patterns yet, so a " +
                    "coded signature cannot be measured.",
            );
    }
}
