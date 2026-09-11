import { Policy } from "../base";

/* The two windows that decide whether an object is still here.
 *
 * `holdMS` is the short one: a real puck rotating on a real table
 * loses contact on a foot now and then, and dropping it on the first
 * bad frame makes the table flicker. The old code calls this
 * `CFG.dropoutMS` (900 ms).
 *
 * `memoryMS` is the long one: how long after being lifted the object
 * is still itself. The old code calls this `CFG.puckMemoryMS`. Two
 * separate numbers because they answer different questions — "is it
 * still on the glass" and "is it still the same one" — and collapsing
 * them means either a flickering table or a puck that inherits a
 * stranger's history.
 */
export class PresencePolicy extends Policy {
    override readonly id = "presence";

    constructor(
        readonly holdMS: number = 900,
        readonly memoryMS: number = 10000,
    ) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return { holdMS: this.holdMS, memoryMS: this.memoryMS };
    }
}
