import { Trait } from "../Trait";
import { FULL_TURN_DEG } from "../direction/constants";
import { shortestAngleDiffDeg } from "../direction/shortestAngleDiffDeg";
import type { BaseSample } from "../BaseSample";
import type { Direction } from "../direction/Direction";
import type { RotatePolicy } from "./RotatePolicy";
import type { RotateSnapshot } from "./RotateSnapshot";

const EMPTY: RotateSnapshot = {
    turning: false,
    deltaFrameDeg: 0,
    deltaTotalDeg: 0,
    turns: 0,
    fromHeadingDeg: 0,
};

/* How far it turned, measured against the last heading that was
   believed.
 *
 * Not against an absolute zero, and not against the previous frame
 * blindly: against the last *accepted* direction. The difference
 * shows the moment a foot drops out. `Direction` keeps its last good
 * heading and sets `known` false; if `Rotate` measured against every
 * frame regardless, the object would appear to snap back and forth
 * across the gap. Skipping unknown frames means a puck that loses a
 * foot mid-turn simply pauses, and picks the turn up where it left
 * off.
 */
export class Rotate extends Trait<RotateSnapshot> {
    override readonly id = "rotate";
    #snapshot: RotateSnapshot = EMPTY;
    #last: number | null = null;
    #origin: number | null = null;

    constructor(
        private readonly direction: Direction,
        private readonly policy: RotatePolicy,
    ) {
        super();
    }

    override update(_sample: BaseSample): void {
        const dir = this.direction.snapshot();
        if (!dir.known) {
            this.#snapshot = {
                ...this.#snapshot,
                turning: false,
                deltaFrameDeg: 0,
            };
            return;
        }
        if (this.#last === null || this.#origin === null) {
            this.#last = dir.headingDeg;
            this.#origin = dir.headingDeg;
            this.#snapshot = { ...EMPTY, fromHeadingDeg: dir.headingDeg };
            return;
        }

        const step = shortestAngleDiffDeg(this.#last, dir.headingDeg);

        /* Too big to be a turn: the heading source changed its mind
           about which foot is the nose. Drop the frame rather than
           bake the error into the total. */
        if (Math.abs(step) > this.policy.maxStepDeg) {
            this.#last = dir.headingDeg;
            this.#snapshot = {
                ...this.#snapshot,
                turning: false,
                deltaFrameDeg: 0,
            };
            return;
        }

        const turning = Math.abs(step) > this.policy.deadZoneDeg;
        const total = this.#snapshot.deltaTotalDeg + (turning ? step : 0);
        this.#last = dir.headingDeg;
        this.#snapshot = {
            turning,
            deltaFrameDeg: turning ? step : 0,
            deltaTotalDeg: total,
            turns: Math.trunc(total / FULL_TURN_DEG),
            fromHeadingDeg: this.#origin,
        };
    }

    override reset(): void {
        this.#snapshot = EMPTY;
        this.#last = null;
        this.#origin = null;
    }

    override snapshot(): RotateSnapshot {
        return this.#snapshot;
    }
}
