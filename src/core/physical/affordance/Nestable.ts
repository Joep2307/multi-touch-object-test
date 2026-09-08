import { Affordance } from "./Affordance";

/* Fits inside another object, and may therefore overlap it.
 *
 * This is where `mayOverlap` belongs. "Two discs cannot lie on each
 * other" is a fact about physical objects, and the duo is the
 * exception to it — so it is recorded as a property of the object,
 * not as a permission. Recognition can then rule out impossible
 * overlaps without consulting anything about roles.
 */
export class Nestable extends Affordance {
    override readonly id = "nestable";

    constructor(readonly mayOverlap: boolean = true) {
        super();
    }
}
