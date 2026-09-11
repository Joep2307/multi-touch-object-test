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
 * **0.06, measured**, on the seven recordings made at the table on
 * 9 September 2026. The real pucks measure sides of 116, 121 and
 * 126 px: an asymmetry of about 6%, which the previous 0.08 sat just
 * above. The cost of that was total silence — a still puck reported a
 * heading on *none* of its 460 three-foot frames. At 0.06 it reports
 * one on all 460, with no foot-hops at all. Across the other
 * recordings the heading rate goes from 60% to 68%, 50% to 74% and
 * 33% to 84%.
 *
 * It buys a few more foot-hops on the pucks that are moving, and that
 * is now affordable: rotation no longer comes from the apex.
 * `PointMatchRotationSource` matches this frame's feet to the previous
 * frame's, so a hop costs a moment's wrong heading rather than a
 * corrupted turn. Before that change, lowering this would have been
 * trading one broken thing for another.
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
        readonly minApexAsymmetry: number = 0.06,
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
