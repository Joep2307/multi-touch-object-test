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
        const fitScore = clamp01(
            1 - fit.residualPX / this.policy.maxResidualPX,
        );
        const sizeScore = this.#sizeScore(fit.radiusPX, sample);
        const confidence = countScore * fitScore * sizeScore;

        this.#snapshot = {
            sensed: confidence > CONFIDENCE_MIN,
            complete: points.length >= expected,
            contactCount: points.length,
            expectedCount: expected,
            centre: fit.centre,
            fittedRadiusPX: fit.radiusPX,
            residualPX: fit.residualPX,
            confidence,
        };
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
