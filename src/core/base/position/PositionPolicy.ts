import { Policy } from "../Policy";

/* How forgiving `Position` is about what counts as an object.
 *
 * Every number the trait uses lives here. `minFeet` is 3 because that
 * is the new standard footprint, and `sizeTolerance` 0.22 comes from
 * `CFG.ringSizeTol`.
 *
 * `shapeTolerance` is **dimensionless on purpose**: it bounds how far
 * the measured spread-to-radius ratio may sit from the kind's own.
 * A ratio has no units, so it says nothing about how big a pixel is —
 * which is what lets the screen-scale estimator be gated on shape
 * agreement without being gated on the very quantity it is trying to
 * calibrate.
 *
 * `heldConfidence` is what a reading with a reconstructed foot in it
 * is worth against a whole one. Not a rejection — a held puck is
 * genuinely there, and refusing to see it is the failure this whole
 * mechanism exists to fix — but a reconstruction is derived rather than
 * measured, and anything choosing between two readings of the same spot
 * should prefer the one nobody had to work out.
 *
 * These are starting values, not measurements. They get tuned against
 * recorded fixtures in phase 6, which is the first time there is
 * anything real to tune them against.
 */
export class PositionPolicy extends Policy {
    override readonly id = "position";

    constructor(
        readonly minFeet: number = 3,
        readonly sizeTolerance: number = 0.22,
        readonly shapeTolerance: number = 0.1,
        readonly heldConfidence: number = 0.6,
    ) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return {
            minFeet: this.minFeet,
            sizeTolerance: this.sizeTolerance,
            shapeTolerance: this.shapeTolerance,
            heldConfidence: this.heldConfidence,
        };
    }
}
