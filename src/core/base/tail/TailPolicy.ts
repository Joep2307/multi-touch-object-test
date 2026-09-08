import { Policy } from "../Policy";

/* How much of a path is worth remembering.
 *
 * Time and count bounds cover slow and fast movement independently.
 * `minStepPX` keeps sensor jitter and a resting object from consuming
 * the whole buffer with visually identical points.
 */
export class TailPolicy extends Policy {
    override readonly id = "tail";

    constructor(
        readonly maxPoints: number = 120,
        readonly maxAgeMS: number = 2_000,
        readonly minStepPX: number = 4,
    ) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return {
            maxPoints: this.maxPoints,
            maxAgeMS: this.maxAgeMS,
            minStepPX: this.minStepPX,
        };
    }
}
