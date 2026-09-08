import type { ContactPoint } from "../../contact/ContactPoint";
import type { CentreFit } from "./CentreFit";

/* Contacts in, middle point out.
 *
 * Abstract because the three kinds of object on this table find their
 * middle in genuinely different ways, not because abstraction is
 * tidy: three feet at 120° are best served by their centroid, feet
 * spread around a ring by a circle fit, and a printed pattern by
 * neither.
 *
 * Returns `null` rather than a guess. A solver that always answers
 * forces every caller to second-guess it, which is how a resting palm
 * becomes a puck.
 */
export abstract class CentreSolver {
    abstract readonly id: string;

    abstract solve(points: readonly ContactPoint[]): CentreFit | null;
}
