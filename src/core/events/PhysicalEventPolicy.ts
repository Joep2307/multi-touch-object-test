import { Policy } from "../base/Policy";
import { PHYSICAL_MOVE_MIN_MM } from "./constants";

/* When an object has moved enough to be worth an event.
 *
 * The rate at which `physical.moved` fires is a decision about what a
 * rule is allowed to see, not a measurement, which is why it lives
 * here and not in the trait. One event per frame at sixty hertz is the
 * wrong granularity for a rule: it invites conditions that are really
 * about a frame rather than about a movement.
 *
 * In millimetres, and converted with the scale the table has
 * calibrated for itself. A threshold in pixels would mean a different
 * distance on a different screen, and the figure it replaces was
 * chosen by measuring real pucks rather than by taste — see the note
 * on the constant.
 *
 * Turning has no equivalent here on purpose. `physical.rotated` comes
 * from the `rotate` gesture, whose definition already carries the step
 * a programme wants, and putting a second threshold here would give
 * the table two opinions about what counts as having turned.
 */
export class PhysicalEventPolicy extends Policy {
    override readonly id = "physicalEvent";

    constructor(readonly minMoveMM: number = PHYSICAL_MOVE_MIN_MM) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return { minMoveMM: this.minMoveMM };
    }
}
