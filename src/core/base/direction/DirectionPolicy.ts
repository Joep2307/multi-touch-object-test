import { Policy } from "../Policy";

/* When a heading is distinct enough to be believed.
 *
 * `minApexAsymmetry` is how much the odd side of a three-foot puck
 * must differ from the other two, as a fraction, before the apex is
 * called. A perfectly equilateral footprint has no nose at all, and
 * one that is nearly equilateral has a nose that jumps between feet
 * from frame to frame — which on the table looks like a puck spinning
 * on its own. Better to say nothing.
 *
 * `minGapMargin` is the same idea for rings: the widest gap must beat
 * the runner-up by this fraction, or the pattern is too even to
 * orient.
 *
 * `slotSnapDeg` is how far a foot may sit from the middle of the
 * compartment its code says it belongs in — `CFG.slotSnapDeg` in the
 * old code. It does double duty in `SlotHeadingSource`: as the
 * per-foot tolerance, and as the margin the best rotation must beat
 * the runner-up by, because a rotationally symmetric code genuinely
 * has more than one right answer.
 */
export class DirectionPolicy extends Policy {
    override readonly id = "direction";

    constructor(
        readonly minApexAsymmetry: number = 0.08,
        readonly minGapMargin: number = 0.15,
        readonly slotSnapDeg: number = 7,
    ) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return {
            minApexAsymmetry: this.minApexAsymmetry,
            minGapMargin: this.minGapMargin,
            slotSnapDeg: this.slotSnapDeg,
        };
    }
}
