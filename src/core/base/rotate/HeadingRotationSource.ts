import { shortestAngleDiffDeg } from "../direction";
import { RotationSource } from "./RotationSource";
import type { BaseSample } from "../BaseSample";
import type { Direction } from "../direction";
import type { RotatePolicy } from "./RotatePolicy";

/* Rotation as the change in where the nose points.
 *
 * Measured against the last *accepted* heading rather than against an
 * absolute zero or against the previous frame blindly. `Direction`
 * keeps its last good heading and sets `known` false when a foot drops
 * out; measuring every frame regardless would make the object appear
 * to snap back and forth across the gap.
 *
 * This is the original approach and it is kept for the kinds that have
 * a genuinely distinguishable nose — a slot-coded puck, whose identity
 * *is* its pattern, reads its orientation exactly. For the standard
 * three-foot puck it does not work, and `PointMatchRotationSource`
 * is why that is no longer a problem.
 */
export class HeadingRotationSource extends RotationSource {
    override readonly id = "heading";
    #last: number | null = null;
    #rejected = 0;

    constructor(
        private readonly direction: Direction,
        private readonly policy: RotatePolicy,
    ) {
        super();
    }

    override step(_sample: BaseSample): number | null {
        const dir = this.direction.snapshot();
        if (!dir.known) return null;
        if (this.#last === null) {
            this.#last = dir.headingDeg;
            return null;
        }

        const step = shortestAngleDiffDeg(this.#last, dir.headingDeg);

        /* Too big to be a turn: the heading source changed its mind
           about which foot is the nose. Drop the frame rather than
           bake the error into the total, and keep the baseline where
           it was so a single bad frame cannot shift it.

           But only for a few frames. A heading that has genuinely
           moved — a puck picked up, turned by hand and put back —
           produces a large step on *every* frame after it, and
           holding the old baseline forever means the puck never
           registers a turn again. So after `maxRejectedFrames` in a
           row the baseline moves to wherever the heading now is. The
           jump itself is still never counted as a turn. */
        if (Math.abs(step) > this.policy.maxStepDeg) {
            this.#rejected += 1;
            if (this.#rejected >= this.policy.maxRejectedFrames) {
                this.#last = dir.headingDeg;
                this.#rejected = 0;
            }
            return null;
        }
        this.#rejected = 0;
        this.#last = dir.headingDeg;
        return step;
    }

    override reset(): void {
        this.#last = null;
        this.#rejected = 0;
    }
}
