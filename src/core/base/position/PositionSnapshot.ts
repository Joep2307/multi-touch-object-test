import type { Vec2 } from "../Vec2";

/* What `Position` answers, and the first thing everything above the
   base reads.
 *
 * `sensed` is the question you asked for: has the table got the
 * contact points it needs for this kind? `complete` is the stricter
 * sibling — every expected foot present, not merely enough of them —
 * and the two differ exactly while an object is holding on through a
 * dropout. `Presence` needs that difference; drawing does not.
 *
 * `held` is why they differ on this particular frame: at least one of
 * the feet was not reported by any driver but reconstructed from the
 * ones that were. A held reading is a real reading of a real object —
 * that is the whole point of reconstructing it — but it is worth less
 * than a whole one, so `confidence` is scaled and `complete` is false.
 * It is separate from `complete` because a footprint can be short of a
 * foot for two quite different reasons, and only one of them is a
 * reconstruction.
 *
 * `fittedRadiusPX` is what was measured. It is a recognition feature
 * and the input to `PxPerMMEstimator`; it is deliberately *not* what
 * gets drawn, because a drawn ring that follows the measurement
 * breathes with sensor noise. The drawn size comes from the kind.
 */
export type PositionSnapshot = {
    readonly sensed: boolean;
    readonly complete: boolean;
    readonly held: boolean;
    readonly contactCount: number;
    readonly expectedCount: number;
    readonly centre: Vec2 | null;
    readonly fittedRadiusPX: number;
    readonly residualPX: number;
    readonly confidence: number;
    /* The part of `confidence` that does not depend on the screen
       scale: enough feet, arranged like this kind. Separate because
       `PxPerMMEstimator` has to be gated on something that is not
       itself a function of the scale it is calibrating — gating it on
       `confidence` deadlocks, and a seed more than a few per cent off
       could then never be corrected. */
    readonly shapeConfidence: number;
};
