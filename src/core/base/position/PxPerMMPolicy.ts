import { Policy } from "../Policy";

/* How far the table is allowed to talk itself into a new screen
   scale.
 *
 * `maxDrift` is the guard that makes self-calibration safe. An
 * estimator with no clamp will happily follow a bad reading — a
 * palm that fitted a circle, a puck half off the edge — and once the
 * scale is wrong, every drawn ring on the table is wrong with it.
 * Twelve per cent is wide enough to correct a mis-declared screen
 * diagonal and far too narrow to accept nonsense.
 *
 * `smoothing` is the weight of one new reading; low, because there
 * are sixty of them a second and none of them is urgent.
 */
export class PxPerMMPolicy extends Policy {
    override readonly id = "pxPerMM";

    constructor(
        readonly smoothing: number = 0.02,
        readonly maxDrift: number = 0.12,
        readonly minConfidence: number = 0.8,
    ) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return {
            smoothing: this.smoothing,
            maxDrift: this.maxDrift,
            minConfidence: this.minConfidence,
        };
    }
}
