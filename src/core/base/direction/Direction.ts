import { Trait } from "../Trait";
import { FULL_TURN_DEG } from "./constants";
import type { BaseSample } from "../BaseSample";
import type { Position } from "../position";
import type { DirectionSnapshot } from "./DirectionSnapshot";
import type { HeadingSource } from "./HeadingSource";

const EMPTY: DirectionSnapshot = {
    known: false,
    headingDeg: 0,
    unit: { x: 1, y: 0 },
    reference: null,
};

/* Which way the object points.
 *
 * Reads `Position`'s snapshot for the centre — a heading is an angle
 * *from* somewhere — and hands the feet to a `HeadingSource`. That
 * split is what lets a new kind of object orient itself by writing one
 * class: the trait, the ray and everything above stay untouched.
 *
 * When the source cannot say, the last good heading is kept and
 * `known` goes false rather than the heading going to zero. A puck
 * that briefly loses a foot must not appear to snap to pointing east.
 */
export class Direction extends Trait<DirectionSnapshot> {
    override readonly id = "direction";
    #snapshot: DirectionSnapshot = EMPTY;

    constructor(
        private readonly position: Position,
        private readonly source: HeadingSource,
    ) {
        super();
    }

    override update(sample: BaseSample): void {
        const pos = this.position.snapshot();
        if (!pos.sensed || pos.centre === null) {
            this.#snapshot = { ...this.#snapshot, known: false };
            return;
        }
        const found = this.source.heading(sample.contacts.points, pos.centre);
        if (found === null) {
            this.#snapshot = { ...this.#snapshot, known: false };
            return;
        }
        const rad = (found.headingDeg * 2 * Math.PI) / FULL_TURN_DEG;
        this.#snapshot = {
            known: true,
            headingDeg: found.headingDeg,
            unit: { x: Math.cos(rad), y: Math.sin(rad) },
            reference: found.reference,
        };
    }

    override reset(): void {
        this.#snapshot = EMPTY;
        /* And whatever the source decided. An object that has left the
           glass takes its nose with it; the next one to land in the
           same place is a different object. */
        this.source.reset();
    }

    override snapshot(): DirectionSnapshot {
        return this.#snapshot;
    }
}
