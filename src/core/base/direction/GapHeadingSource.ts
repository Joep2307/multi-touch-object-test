import { HeadingSource } from "./HeadingSource";
import { FULL_TURN_DEG } from "./constants";
import type { SensedContact } from "../../contact";
import type { Vec2 } from "../Vec2";
import type { DirectionPolicy } from "./DirectionPolicy";

/* The nose of a ring object: the middle of its widest gap.
 *
 * Feet spread around a circle with one deliberate gap in them. The
 * bisector of that gap is the orientation, and taking the *middle* of
 * the gap rather than the foot beside it means the answer comes from
 * two measurements instead of one, so a single trembling foot moves it
 * half as much.
 *
 * Serves the legacy ring and slot-coded kinds, which stay supported
 * indefinitely.
 */
export class GapHeadingSource extends HeadingSource {
    override readonly id = "heading.gap";

    constructor(private readonly policy: DirectionPolicy) {
        super();
    }

    override heading(
        points: readonly SensedContact[],
        centre: Vec2,
    ): { headingDeg: number; reference: Vec2 } | null {
        if (points.length < 3) return null;

        const angles: number[] = [];
        for (const p of points) {
            const dx = p.x - centre.x;
            const dy = p.y - centre.y;
            if (dx === 0 && dy === 0) return null;
            const deg = (Math.atan2(dy, dx) * FULL_TURN_DEG) / (2 * Math.PI);
            angles.push(
                ((deg % FULL_TURN_DEG) + FULL_TURN_DEG) % FULL_TURN_DEG,
            );
        }
        angles.sort((x, y) => x - y);

        let widest = -1;
        let widestAt = -1;
        let runnerUp = -1;
        for (let i = 0; i < angles.length; i += 1) {
            const here = angles[i];
            const next = angles[(i + 1) % angles.length];
            if (here === undefined || next === undefined) return null;
            const gap = (next - here + FULL_TURN_DEG) % FULL_TURN_DEG;
            if (gap > widest) {
                runnerUp = widest;
                widest = gap;
                widestAt = i;
            } else if (gap > runnerUp) {
                runnerUp = gap;
            }
        }
        if (widestAt < 0 || widest <= 0) return null;

        /* Too even a ring has no widest gap worth the name, and the
           heading would hop from one gap to another. */
        if (
            runnerUp > 0 &&
            (widest - runnerUp) / widest < this.policy.minGapMargin
        ) {
            return null;
        }

        const start = angles[widestAt];
        if (start === undefined) return null;
        const headingDeg = (start + widest / 2) % FULL_TURN_DEG;

        const rad = (headingDeg * 2 * Math.PI) / FULL_TURN_DEG;
        const r = Math.hypot(
            points[0] === undefined ? 0 : points[0].x - centre.x,
            points[0] === undefined ? 0 : points[0].y - centre.y,
        );
        return {
            headingDeg,
            reference: {
                x: centre.x + r * Math.cos(rad),
                y: centre.y + r * Math.sin(rad),
            },
        };
    }
}
