import { Affordance } from "./Affordance";

/* Has a hole you can see the map through and tap into.
 *
 * `holeFraction` is the hole's diameter as a fraction of the object's
 * outer diameter — the old code's `PUCK_HOLE`, 0.7, which is the
 * printed puck's 56 mm window in its 80 mm face. Kept as a fraction
 * rather than millimetres so a bigger puck of the same design needs no
 * second number.
 */
export class Apertured extends Affordance {
    override readonly id = "apertured";

    constructor(readonly holeFraction: number = 0.7) {
        super();
    }
}
