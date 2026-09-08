import { Policy } from "../Policy";

/* How strongly one frame may change the velocity estimate.
 *
 * A single weight gives a bounded-memory exponential window. This
 * avoids retaining another sample buffer while still damping the noise
 * that differentiation would otherwise magnify.
 */
export class AccelerationPolicy extends Policy {
    override readonly id = "acceleration";

    constructor(readonly smoothing: number = 0.25) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return { smoothing: this.smoothing };
    }
}
