import { Trait } from "../Trait";
import type { BaseSample } from "../BaseSample";
import type { Move } from "../move/Move";
import type { MotionSample } from "./MotionSample";
import type { MotionHistoryPolicy } from "./MotionHistoryPolicy";
import type { MotionHistorySnapshot } from "./MotionHistorySnapshot";

const EMPTY_POINTS: readonly MotionSample[] = Object.freeze([]);
const EMPTY: MotionHistorySnapshot = Object.freeze({ points: EMPTY_POINTS });

/* Where the object has been, without crossing the tier boundary.
 *
 * The path follows `Move.to`, so it inherits the centre smoothing that
 * removes contact noise before derived traits see it. The last recorded
 * place survives age pruning internally: otherwise a resting object
 * would periodically recreate the same point whenever its history
 * expired.
 *
 * Storage is a fixed ring because most frames neither add nor expire a
 * point. Rebuilding an array on those frames would turn stationary pucks
 * into a steady source of garbage for no observable change.
 */
export class MotionHistory extends Trait<MotionHistorySnapshot> {
    override readonly id = "motionHistory";
    readonly #capacity: number;
    readonly #buffer: Array<MotionSample | undefined>;
    #head = 0;
    #size = 0;
    #lastRecorded: MotionSample | null = null;
    #snapshot: MotionHistorySnapshot = EMPTY;

    constructor(
        private readonly move: Move,
        private readonly policy: MotionHistoryPolicy,
    ) {
        super();
        this.#capacity = Math.max(0, Math.floor(policy.maxPoints));
        this.#buffer = new Array<MotionSample | undefined>(this.#capacity);
    }

    override update(sample: BaseSample): void {
        const position = this.move.snapshot().to;
        if (position === null) {
            this.reset();
            return;
        }

        let changed = this.#expire(sample.at - this.policy.maxAgeMS);
        if (this.#shouldRecord(position)) {
            const point: MotionSample = Object.freeze({
                x: position.x,
                y: position.y,
                at: sample.at,
            });
            this.#record(point);
            changed = true;
        }
        if (changed) this.#publish();
    }

    #expire(oldestAt: number): boolean {
        let changed = false;
        while (this.#size > 0) {
            const oldest = this.#buffer[this.#head];
            if (oldest === undefined) {
                throw new Error("Motion history lost its oldest sample");
            }
            if (oldest.at >= oldestAt) break;
            this.#buffer[this.#head] = undefined;
            this.#head = (this.#head + 1) % this.#capacity;
            this.#size -= 1;
            changed = true;
        }
        return changed;
    }

    #shouldRecord(position: {
        readonly x: number;
        readonly y: number;
    }): boolean {
        if (this.#capacity === 0) return false;
        if (this.#lastRecorded === null) return true;
        return (
            Math.hypot(
                position.x - this.#lastRecorded.x,
                position.y - this.#lastRecorded.y,
            ) >= this.policy.minStepPX
        );
    }

    #record(point: MotionSample): void {
        if (this.#size === this.#capacity) {
            this.#buffer[this.#head] = point;
            this.#head = (this.#head + 1) % this.#capacity;
        } else {
            const end = (this.#head + this.#size) % this.#capacity;
            this.#buffer[end] = point;
            this.#size += 1;
        }
        this.#lastRecorded = point;
    }

    #publish(): void {
        if (this.#size === 0) {
            this.#snapshot = EMPTY;
            return;
        }
        const points = new Array<MotionSample>(this.#size);
        for (let offset = 0; offset < this.#size; offset += 1) {
            const index = (this.#head + offset) % this.#capacity;
            const point = this.#buffer[index];
            if (point === undefined) {
                throw new Error("Motion history contains an empty slot");
            }
            points[offset] = point;
        }
        this.#snapshot = Object.freeze({ points: Object.freeze(points) });
    }

    override reset(): void {
        if (this.#size > 0) this.#buffer.fill(undefined);
        this.#head = 0;
        this.#size = 0;
        this.#lastRecorded = null;
        this.#snapshot = EMPTY;
    }

    override snapshot(): MotionHistorySnapshot {
        return this.#snapshot;
    }
}
