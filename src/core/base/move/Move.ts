import { Trait } from "../Trait";
import type { BaseSample } from "../BaseSample";
import type { Vec2 } from "../Vec2";
import type { Position } from "../position";
import type { MovePolicy } from "./MovePolicy";
import type { MoveSnapshot } from "./MoveSnapshot";

const ZERO: Vec2 = { x: 0, y: 0 };

const EMPTY: MoveSnapshot = {
    moving: false,
    from: null,
    to: null,
    deltaFrame: ZERO,
    deltaTotal: ZERO,
    distancePX: 0,
    travelledPX: 0,
};

/* From where to where.
 *
 * Reads `Position`'s centre and smooths it before differencing.
 * Smoothing first is the whole point: a centre that jitters by a
 * pixel produces a delta that jitters by a pixel, and everything
 * built on that delta — speed, acceleration, a pan gesture — inherits
 * the noise amplified rather than damped.
 *
 * Everything resets when the object stops being sensed. An object
 * lifted from one corner and put down in another has not travelled
 * across the table, and treating it as though it had would give the
 * map an enormous pan on the frame it reappears.
 */
export class Move extends Trait<MoveSnapshot> {
    override readonly id = "move";
    #snapshot: MoveSnapshot = EMPTY;
    #smoothed: Vec2 | null = null;
    #origin: Vec2 | null = null;
    #from: Vec2 | null = null;

    constructor(
        private readonly position: Position,
        private readonly policy: MovePolicy,
    ) {
        super();
    }

    override update(_sample: BaseSample): void {
        const pos = this.position.snapshot();
        if (!pos.sensed || pos.centre === null) {
            this.reset();
            return;
        }
        const centre = pos.centre;

        if (this.#smoothed === null) {
            this.#smoothed = centre;
            this.#origin = centre;
            this.#from = centre;
            this.#snapshot = {
                ...EMPTY,
                from: centre,
                to: centre,
            };
            return;
        }

        const w = this.policy.smoothing;
        const next: Vec2 = {
            x: this.#smoothed.x * (1 - w) + centre.x * w,
            y: this.#smoothed.y * (1 - w) + centre.y * w,
        };
        const deltaFrame: Vec2 = {
            x: next.x - this.#smoothed.x,
            y: next.y - this.#smoothed.y,
        };
        const distancePX = Math.hypot(deltaFrame.x, deltaFrame.y);
        const moving = distancePX > this.policy.deadZonePX;

        /* A new leg of movement starts where the object was standing
           still, not where it happens to be now. */
        if (moving && !this.#snapshot.moving) this.#from = this.#smoothed;

        const origin = this.#origin ?? next;
        this.#smoothed = next;
        this.#snapshot = {
            moving,
            from: this.#from,
            to: next,
            deltaFrame,
            deltaTotal: { x: next.x - origin.x, y: next.y - origin.y },
            distancePX,
            travelledPX:
                this.#snapshot.travelledPX + (moving ? distancePX : 0),
        };
    }

    override reset(): void {
        this.#snapshot = EMPTY;
        this.#smoothed = null;
        this.#origin = null;
        this.#from = null;
    }

    override snapshot(): MoveSnapshot {
        return this.#snapshot;
    }
}
