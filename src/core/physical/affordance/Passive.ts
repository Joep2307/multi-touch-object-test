import { Affordance } from "./Affordance";

/* Has no menu of its own; acts only as something to be acted upon.
 *
 * A passive object can still be a target — you can place a marker on
 * it, vote on it, point at it — but it never opens a ring menu. Kept
 * as an affordance rather than as an empty role so that "this thing
 * has nothing to offer" does not need a role at all.
 */
export class Passive extends Affordance {
    override readonly id = "passive";
}
