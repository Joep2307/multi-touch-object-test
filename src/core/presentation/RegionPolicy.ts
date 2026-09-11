import { Policy } from "../base/Policy";
import { REGION_HYSTERESIS_MM } from "./constants";

/* How far inside a region an object has to be before it counts, and
   how far outside before it stops.
 *
 * The same problem as being near another object, and the same answer:
 * a single edge has no stable verdict for something resting exactly on
 * it. An object put down half on the line would cross in and out on
 * sensor noise alone, and a rule watching for the crossing would fire
 * for as long as it lay there.
 *
 * The band is in millimetres because a region is a place on a physical
 * table.
 */
export class RegionPolicy extends Policy {
    override readonly id = "region";

    constructor(readonly hysteresisMM: number = REGION_HYSTERESIS_MM) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return { hysteresisMM: this.hysteresisMM };
    }
}
