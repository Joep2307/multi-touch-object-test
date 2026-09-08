import { Policy } from "../Policy";

/* How still is still.
 *
 * `smoothing` is the weight of one new reading in the smoothed
 * centre. The old table used `CFG.smoothing = 4`, a frame count; the
 * equivalent weight is roughly 2 / (n + 1), hence 0.4. Stated here
 * because the translation is exactly the kind of thing that gets lost
 * and then re-tuned from scratch a year later.
 *
 * `deadZonePX` is how far the smoothed centre must shift in one frame
 * before the object counts as moving. It is deliberately small and is
 * *not* `CFG.jitterPX` (22), which is a different threshold doing a
 * different job in the old code — separating one puck's feet from
 * another's, not deciding whether a puck is still.
 */
export class MovePolicy extends Policy {
    override readonly id = "move";

    constructor(
        readonly smoothing: number = 0.4,
        readonly deadZonePX: number = 1.5,
    ) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return {
            smoothing: this.smoothing,
            deadZonePX: this.deadZonePX,
        };
    }
}
