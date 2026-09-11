import { HeadingSource } from "./HeadingSource";
import { FULL_TURN_DEG } from "./constants";
import type { SensedContact } from "../../contact/SensedContact";
import type { DirectionPolicy } from "./DirectionPolicy";
import type { Vec2 } from "../Vec2";

/* The nose of a three-foot object: its apex.
 *
 * A three-point footprint is isosceles by design — two feet the same
 * distance apart, one odd side — and the apex is the vertex the two
 * equal sides meet at, which is the vertex *opposite* the odd side.
 * That is the whole trick, and it is why the feet are placed that way
 * rather than at a plain 120°.
 *
 * The primary heading source, matching the three-point kind being
 * standardised on.
 *
 * **Once a foot has been named the nose, it stays the nose while it is
 * on the glass.** The feet of a puck do not change identity while it
 * lies there; only the measurement wobbles. Deciding afresh every
 * frame is asking the same question of the same object sixty times a
 * second and accepting a different answer each time — and on the real
 * pucks it does exactly that, because the two candidate noses are
 * about four per cent apart against a measurement noise of 1.6%.
 *
 * Measured on the seven table recordings of 9 September 2026: holding
 * the choice takes the foot-hops from six, seven and five per
 * recording to **none**, and costs nothing — the heading is reported
 * on exactly as many frames as before.
 *
 * What this does **not** fix is the same puck put down again naming a
 * different foot. That is not a measurement that can be improved; the
 * information is not in the footprint. One of the real pucks has
 * candidates 1.7% apart, which is a shape that has no nose, and the
 * answer to that is a differently made puck. See `todo/TODO.md`.
 */
export class ApexHeadingSource extends HeadingSource {
    override readonly id = "heading.apex";
    /* The contact this source called the nose, for as long as that
       contact is still down. */
    #chosen: number | null = null;

    constructor(private readonly policy: DirectionPolicy) {
        super();
    }

    override reset(): void {
        this.#chosen = null;
    }

    override heading(
        points: readonly SensedContact[],
        centre: Vec2,
    ): { headingDeg: number; reference: Vec2 } | null {
        if (points.length !== 3) return null;
        const [a, b, c] = points;
        if (a === undefined || b === undefined || c === undefined) return null;

        /* `side[i]` is the length of the side opposite point i. */
        const side = [
            Math.hypot(b.x - c.x, b.y - c.y),
            Math.hypot(a.x - c.x, a.y - c.y),
            Math.hypot(a.x - b.x, a.y - b.y),
        ];

        let apex = -1;
        let best = 0;
        for (let i = 0; i < 3; i += 1) {
            const own = side[i];
            const o1 = side[(i + 1) % 3];
            const o2 = side[(i + 2) % 3];
            if (own === undefined || o1 === undefined || o2 === undefined) {
                return null;
            }
            const others = (o1 + o2) / 2;
            if (others <= 0) return null;
            const off = Math.abs(own - others) / others;
            if (off > best) {
                best = off;
                apex = i;
            }
        }

        /* Too even to orient: any of the three feet would do, so the
           nose would jump between them frame to frame. */
        if (apex < 0 || best < this.policy.minApexAsymmetry) {
            this.#chosen = null;
            return null;
        }

        /* Held, if the foot we named last time is still down. */
        const held = points.findIndex((q) => q.id === this.#chosen);
        const p = points[held >= 0 ? held : apex];
        if (p === undefined) return null;
        this.#chosen = p.id;
        const dx = p.x - centre.x;
        const dy = p.y - centre.y;
        if (dx === 0 && dy === 0) return null;
        const deg = (Math.atan2(dy, dx) * FULL_TURN_DEG) / (2 * Math.PI);
        return {
            headingDeg:
                ((deg % FULL_TURN_DEG) + FULL_TURN_DEG) % FULL_TURN_DEG,
            reference: { x: p.x, y: p.y },
        };
    }
}
