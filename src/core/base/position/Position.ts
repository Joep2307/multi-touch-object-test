import { Trait } from "../Trait";
import { CONFIDENCE_MIN } from "./constants";
import { scoreFootprint } from "./scoreFootprint";
import type { BaseSample } from "../BaseSample";
import type { CentreSolver } from "./CentreSolver";
import type { PositionPolicy } from "./PositionPolicy";
import type { PositionSnapshot } from "./PositionSnapshot";

const EMPTY: PositionSnapshot = {
    sensed: false,
    complete: false,
    held: false,
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
 *
 * A footprint that arrives with a reconstructed foot in it is scored
 * exactly like any other and then discounted once, at the end. The
 * trait deliberately learns nothing else about holding: the shape it
 * was handed is a whole footprint, which is what
 * `FootprintCompletion` is for.
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
        const held = points.some((point) => point.reconstructed === true);
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

        const scored = scoreFootprint(
            fit,
            points.length,
            sample.spec,
            sample.pxPerMM,
            this.policy,
        );
        const shapeConfidence = scored.shapeConfidence;
        const confidence = held
            ? scored.confidence * this.policy.heldConfidence
            : scored.confidence;

        this.#snapshot = {
            sensed: confidence > CONFIDENCE_MIN,
            /* Never complete while a foot was reconstructed, however
               many points arrived. `complete` is what says the reading
               is whole enough to calibrate the table's scale from, and
               a reconstructed foot carries the scale it was
               reconstructed with. */
            complete: !held && points.length >= expected,
            held,
            contactCount: points.length,
            expectedCount: expected,
            centre: fit.centre,
            fittedRadiusPX: fit.radiusPX,
            residualPX: fit.residualPX,
            confidence,
            shapeConfidence,
        };
    }

    override reset(): void {
        this.#snapshot = EMPTY;
    }

    override snapshot(): PositionSnapshot {
        return this.#snapshot;
    }
}
