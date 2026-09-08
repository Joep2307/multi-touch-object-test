import { HeadingSource } from "./HeadingSource";
import { FULL_TURN_DEG } from "./constants";
import type { ContactPoint } from "../../contact/ContactPoint";
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
 */
export class ApexHeadingSource extends HeadingSource {
    override readonly id = "heading.apex";

    constructor(private readonly policy: DirectionPolicy) {
        super();
    }

    override heading(
        points: readonly ContactPoint[],
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
        if (apex < 0 || best < this.policy.minApexAsymmetry) return null;

        const p = points[apex];
        if (p === undefined) return null;
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
