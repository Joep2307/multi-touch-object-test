import type { BaseSample } from "../BaseSample";
import type { PositionSnapshot } from "./PositionSnapshot";
import type { PxPerMMPolicy } from "./PxPerMMPolicy";

/* The table works out how big its own pixels are, from the objects on
   it.
 *
 * Today `pxPerMM` comes from `CFG.screenDiagIn`, a number somebody
 * typed in. If it is two per cent off, an 80 mm ring is drawn 1.6 mm
 * wrong at the rim, which is visible from across the room and is why
 * the animation and the physical puck do not line up.
 *
 * But a puck's ring is a known size, and the fit measures it in
 * pixels. Divide one by the other and the screen has told you its own
 * scale. No spec to trust, no calibration step anyone has to remember
 * before a session, and it survives the screen being swapped.
 *
 * Three guards, because a self-correcting number that corrects itself
 * wrongly is worse than a fixed one that is slightly off:
 *
 *   - only `complete` readings count, so a puck with a foot missing
 *     cannot shrink the whole table;
 *   - only readings whose *shape* agreement is above
 *     `minConfidence` count, so a hand that happened to fit a circle
 *     cannot either;
 *   - the result is clamped to `maxDrift` around the seed, so even a
 *     long run of bad readings cannot walk the scale away.
 *
 * The seed stays the anchor for the whole session on purpose. An
 * estimator anchored to its own last answer can drift anywhere given
 * enough frames; anchored to the seed it can only ever correct it.
 */
export class PxPerMMEstimator {
    readonly #seed: number;
    readonly #policy: PxPerMMPolicy;
    #value: number;
    #samples = 0;

    constructor(seed: number, policy: PxPerMMPolicy) {
        this.#seed = seed;
        this.#value = seed;
        this.#policy = policy;
    }

    get value(): number {
        return this.#value;
    }

    get sampleCount(): number {
        return this.#samples;
    }

    /* Feed one frame's reading. Returns the scale to use next frame,
       which is also what `value` reports. */
    observe(snapshot: PositionSnapshot, sample: BaseSample): number {
        if (!snapshot.complete) return this.#value;
        /* Gated on `shapeConfidence`, never on `confidence`.
           `confidence` includes the size check, and the size check is
           computed from the very scale being calibrated: a seed more
           than about four per cent off scored too low to be trusted,
           so the estimator ignored every reading and the scale stayed
           wrong forever. A calibrator may not be gated by the thing it
           calibrates. */
        if (snapshot.shapeConfidence < this.#policy.minConfidence) {
            return this.#value;
        }
        const knownMM = sample.spec.footRadiusMM;
        const measuredPX = snapshot.fittedRadiusPX;
        if (
            !Number.isFinite(knownMM) ||
            !Number.isFinite(measuredPX) ||
            knownMM <= 0 ||
            measuredPX <= 0
        ) {
            return this.#value;
        }

        const measured = measuredPX / knownMM;
        const w = this.#policy.smoothing;
        const blended = this.#value * (1 - w) + measured * w;

        const lo = this.#seed * (1 - this.#policy.maxDrift);
        const hi = this.#seed * (1 + this.#policy.maxDrift);
        this.#value = Math.min(hi, Math.max(lo, blended));
        this.#samples += 1;
        return this.#value;
    }

    reset(): void {
        this.#value = this.#seed;
        this.#samples = 0;
    }
}
