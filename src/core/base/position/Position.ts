import { Trait } from "../Trait";
import { CONFIDENCE_MIN } from "./constants";
import type { BaseSample } from "../BaseSample";
import type { CentreSolver } from "./CentreSolver";
import type { PositionPolicy } from "./PositionPolicy";
import type { PositionSnapshot } from "./PositionSnapshot";

const EMPTY: PositionSnapshot = {
    sensed: false,
    complete: false,
    contactCount: 0,
    expectedCount: 0,
    centre: null,
    fittedRadiusPX: 0,
    residualPX: 0,
    confidence: CONFIDENCE_MIN,
    shapeConfidence: CONFIDENCE_MIN,
};

/* Where the object is, and whether the table can see it at all.
 *
 * The first trait, and the one everything else depends on: `Direction`
 * needs a centre to measure a nose from, `Move` needs a centre to
 * measure a displacement between, and `Presence` needs `sensed` to
 * know an object is there.
 *
 * Confidence is the product of three independent judgements rather
 * than a single threshold, because the three failures are different
 * and a single number cannot tell them apart: too few feet, feet at
 * the wrong distance for this kind, and feet that do not agree with
 * each other. Multiplying means any one of them being bad is enough
 * to make the reading untrusted, which is the behaviour wanted — a
 * hand with three fingers at roughly the right spread should not
 * become a puck because two of the three checks passed.
 */
export class Position extends Trait<PositionSnapshot> {
    override readonly id = "position";
    #snapshot: PositionSnapshot = EMPTY;

    constructor(
        private readonly solver: CentreSolver,
        private readonly policy: PositionPolicy,
    ) {
        super();
    }

    override update(sample: BaseSample): void {
        const points = sample.contacts.points;
        const expected = sample.spec.expectedCount;
        if (points.length < this.policy.minFeet) {
            this.#snapshot = {
                ...EMPTY,
                contactCount: points.length,
                expectedCount: expected,
            };
            return;
        }

        const fit = this.solver.solve(points);
        if (fit === null) {
            this.#snapshot = {
                ...EMPTY,
                contactCount: points.length,
                expectedCount: expected,
            };
            return;
        }

        const countScore = clamp01(points.length / Math.max(1, expected));
        const shapeScore = this.#shapeScore(fit, sample);
        const sizeScore = this.#sizeScore(fit.radiusPX, sample);
        const shapeConfidence = countScore * shapeScore;
        const confidence = shapeConfidence * sizeScore;

        this.#snapshot = {
            sensed: confidence > CONFIDENCE_MIN,
            complete: points.length >= expected,
            contactCount: points.length,
            expectedCount: expected,
            centre: fit.centre,
            fittedRadiusPX: fit.radiusPX,
            residualPX: fit.residualPX,
            confidence,
            shapeConfidence,
        };
    }

    /* Are the feet arranged like this kind? Compared as a **ratio** —
       spread over radius — so the answer holds whatever the screen
       scale turns out to be.

       Two things forced that. First, the spread is scored against the
       kind's *inherent* spread rather than against zero: zero is right
       for a ring and for an equilateral triad, but an equilateral
       triad has no distinguishable nose, so the standard three-point
       footprint is deliberately asymmetric and its feet genuinely do
       sit at different distances from the centroid. Scoring that
       against zero punished exactly the asymmetry the heading needs.

       Second, both quantities had to lose their units. A score in
       pixels is a function of `pxPerMM`, and `PxPerMMEstimator` is
       gated on this score — so a scale that started wrong made the
       score low, which made the estimator ignore the reading, which
       left the scale wrong. A ratio breaks that loop. */
    #shapeScore(
        fit: { radiusPX: number; residualPX: number },
        sample: BaseSample,
    ): number {
        if (fit.radiusPX <= 0) return CONFIDENCE_MIN;
        const measured = fit.residualPX / fit.radiusPX;
        const radiusMM = sample.spec.footRadiusMM;
        const expected =
            radiusMM > 0
                ? (sample.spec.footRadiusSpreadMM ?? 0) / radiusMM
                : 0;
        const off = Math.abs(measured - expected);
        return clamp01(1 - off / this.policy.shapeTolerance);
    }

    /* Is what we measured the right size for this kind? Size is a
       recognition feature in its own right: two pucks with the same
       pattern but a different ring are two different pucks, and
       checking size *before* the best fit wins is what stops a
       look-alike silencing the real one. */
    #sizeScore(radiusPX: number, sample: BaseSample): number {
        const expectedPX = sample.spec.footRadiusMM * sample.pxPerMM;
        if (expectedPX <= 0) return CONFIDENCE_MIN;
        const off = Math.abs(radiusPX - expectedPX) / expectedPX;
        return clamp01(1 - off / this.policy.sizeTolerance);
    }

    override reset(): void {
        this.#snapshot = EMPTY;
    }

    override snapshot(): PositionSnapshot {
        return this.#snapshot;
    }
}

function clamp01(v: number): number {
    if (Number.isNaN(v)) return 0;
    return Math.min(1, Math.max(0, v));
}
