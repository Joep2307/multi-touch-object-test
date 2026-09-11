import { Trait } from "../Trait";
import { FULL_TURN_DEG } from "../direction/constants";
import type { BaseSample } from "../BaseSample";
import type { Direction } from "../direction/Direction";
import type { RotatePolicy } from "./RotatePolicy";
import type { RotateSnapshot } from "./RotateSnapshot";
import type { RotationSource } from "./RotationSource";

const EMPTY: RotateSnapshot = {
    turning: false,
    deltaFrameDeg: 0,
    deltaTotalDeg: 0,
    turns: 0,
    fromHeadingDeg: 0,
};

/* How far it has turned.
 *
 * The trait accumulates; a `RotationSource` decides what one frame's
 * turn was. Splitting the two is what let the table's real failure be
 * fixed without touching anything that reads a rotation: the standard
 * puck has no distinguishable nose, so measuring rotation as a change
 * of heading read a full circle as 97 to 203 degrees. Matching the
 * feet to the previous frame instead reads the same recording as
 * 351.5 degrees, and needs no nose at all.
 *
 * A source returning null is a **pause**, not a zero. A puck that
 * loses a foot mid-turn picks the turn up where it left off rather
 * than recording that it stopped, and that distinction is the whole
 * reason `step` is nullable.
 *
 * **Every step is accumulated, dead zone or not.** The dead zone says
 * whether the object is *being turned* right now, which is a question
 * about this frame and belongs to `turning` and `deltaFrameDeg`; it is
 * not a licence to throw the measurement away. Dropping sub-dead-zone
 * steps from the total meant a turn slower than 24 degrees a second at
 * sixty frames never accumulated at all: 0.3 degrees a frame for three
 * hundred frames — a real 90-degree turn over five seconds — reported
 * zero. Noise is zero-mean, so summing it goes nowhere; what decides
 * whether a turn *means* anything is the gesture threshold, which is a
 * programme's business rather than a trait's.
 *
 * `fromHeadingDeg` is where the object was pointing when it was put
 * down, which is what makes "turn a bit further" mean the same thing
 * wherever it landed. It comes from `Direction` and is the only thing
 * here that does — a rotation source that cannot name a heading simply
 * leaves it at zero, and nothing that reads a turn is any the worse
 * for it.
 */
export class Rotate extends Trait<RotateSnapshot> {
    override readonly id = "rotate";
    #snapshot: RotateSnapshot = EMPTY;
    #origin: number | null = null;

    constructor(
        private readonly source: RotationSource,
        private readonly policy: RotatePolicy,
        private readonly direction: Direction | null = null,
    ) {
        super();
    }

    override update(sample: BaseSample): void {
        if (this.#origin === null) {
            const heading = this.direction?.snapshot();
            if (heading !== undefined && heading.known) {
                this.#origin = heading.headingDeg;
            }
        }

        const step = this.source.step(sample);
        if (step === null) {
            this.#snapshot = {
                ...this.#snapshot,
                turning: false,
                deltaFrameDeg: 0,
                fromHeadingDeg: this.#origin ?? 0,
            };
            return;
        }

        const turning = Math.abs(step) > this.policy.deadZoneDeg;
        const total = this.#snapshot.deltaTotalDeg + step;
        this.#snapshot = {
            turning,
            deltaFrameDeg: turning ? step : 0,
            deltaTotalDeg: total,
            turns: Math.trunc(total / FULL_TURN_DEG),
            fromHeadingDeg: this.#origin ?? 0,
        };
    }

    override reset(): void {
        this.#snapshot = EMPTY;
        this.#origin = null;
        this.source.reset();
    }

    override snapshot(): RotateSnapshot {
        return this.#snapshot;
    }
}
