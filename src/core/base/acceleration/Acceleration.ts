import { Trait } from "../Trait";
import type { BaseSample } from "../BaseSample";
import type { Vec2 } from "../Vec2";
import type { Move } from "../move";
import type { AccelerationPolicy } from "./AccelerationPolicy";
import type { AccelerationSnapshot } from "./AccelerationSnapshot";

const MILLISECONDS_PER_SECOND = 1_000;
const ZERO: Vec2 = Object.freeze({ x: 0, y: 0 });
const EMPTY: AccelerationSnapshot = Object.freeze({
    velocity: ZERO,
    speedPXperS: 0,
    acceleration: ZERO,
    peakSpeed: 0,
});

/* Speed derived from the displacement that `Move` already smoothed.
 *
 * Non-positive time steps are ignored rather than clamped. Clamping
 * would turn an invalid interval into an enormous velocity, poisoning
 * both the exponential estimate and its peak long after that frame.
 */
export class Acceleration extends Trait<AccelerationSnapshot> {
    override readonly id = "acceleration";
    #snapshot: AccelerationSnapshot = EMPTY;
    #lastAt: number | null = null;
    #hasVelocity = false;

    constructor(
        private readonly move: Move,
        private readonly policy: AccelerationPolicy,
    ) {
        super();
    }

    override update(sample: BaseSample): void {
        if (this.move.snapshot().to === null) {
            this.reset();
            return;
        }
        if (this.#lastAt === null) {
            this.#lastAt = sample.at;
            return;
        }

        const elapsedMS = sample.at - this.#lastAt;
        if (elapsedMS < 0) {
            /* A clock rollback breaks the interval that acceleration
               needs. Re-prime from this frame so the next delta is not
               divided by a duration measured from a different frame. */
            this.#lastAt = sample.at;
            this.#hasVelocity = false;
            return;
        }
        if (elapsedMS === 0) return;

        const elapsedS = elapsedMS / MILLISECONDS_PER_SECOND;
        const delta = this.move.snapshot().deltaFrame;
        const measured: Vec2 = {
            x: delta.x / elapsedS,
            y: delta.y / elapsedS,
        };
        const previous = this.#snapshot.velocity;
        const velocity = this.#hasVelocity
            ? this.#smooth(previous, measured)
            : measured;
        const acceleration: Vec2 = this.#hasVelocity
            ? {
                  x: (velocity.x - previous.x) / elapsedS,
                  y: (velocity.y - previous.y) / elapsedS,
              }
            : ZERO;
        const speedPXperS = Math.hypot(velocity.x, velocity.y);

        this.#snapshot = Object.freeze({
            velocity: Object.freeze(velocity),
            speedPXperS,
            acceleration: Object.freeze(acceleration),
            peakSpeed: Math.max(this.#snapshot.peakSpeed, speedPXperS),
        });
        this.#lastAt = sample.at;
        this.#hasVelocity = true;
    }

    #smooth(previous: Vec2, measured: Vec2): Vec2 {
        const weight = this.policy.smoothing;
        return {
            x: previous.x * (1 - weight) + measured.x * weight,
            y: previous.y * (1 - weight) + measured.y * weight,
        };
    }

    override reset(): void {
        this.#snapshot = EMPTY;
        this.#lastAt = null;
        this.#hasVelocity = false;
    }

    override snapshot(): AccelerationSnapshot {
        return this.#snapshot;
    }
}
