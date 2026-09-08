import { Affordance } from "./Affordance";

/* Accepts another object inside it: the host half of the duo.
 *
 * The counterpart to `Nestable`. Both halves are marked because the
 * pair is only valid one way round, and a check that only knows about
 * one half cannot tell a legal nesting from two pucks stacked by
 * accident.
 */
export class Nesting extends Affordance {
    override readonly id = "nesting";
}
