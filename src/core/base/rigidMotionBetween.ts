import { FULL_TURN_DEG } from "./direction/constants";
import { MIN_MATCHED_POINTS } from "./constants";
import type { RigidMotion } from "./RigidMotion";
import type { Vec2 } from "./Vec2";

/* The rotation and translation that best explain how a set of matched
   points moved.
 *
 * The two-dimensional case of finding the rotation that best aligns
 * two sets of matched points: centre both on their own mean, then the
 * best angle is `atan2` of the summed cross products over the summed
 * dot products. Exact, one pass, no search.
 *
 * Points are matched **by key**, never by proximity. At the table the
 * key is a contact id, which the touch driver keeps stable for as long
 * as a foot stays down — so a foot that dropped out and came back has a
 * new id and is correctly ignored rather than matched to whichever foot
 * happens to be nearest. Only keys present in both frames take part.
 *
 * One function for both callers on purpose. `PointMatchRotationSource`
 * wants the angle and `FootprintCompletion` wants the whole motion, and
 * two copies of this loop would be two places for the sign of the cross
 * product to be got wrong in.
 */
export function rigidMotionBetween(
    from: ReadonlyMap<number, Vec2>,
    to: ReadonlyMap<number, Vec2>,
): RigidMotion | null {
    const keys: number[] = [];
    for (const key of to.keys()) {
        if (from.has(key)) keys.push(key);
    }
    if (keys.length < MIN_MATCHED_POINTS) return null;

    const before = centreOf(from, keys);
    const after = centreOf(to, keys);
    let cross = 0;
    let dot = 0;
    for (const key of keys) {
        const a = from.get(key);
        const b = to.get(key);
        if (a === undefined || b === undefined) continue;
        const ax = a.x - before.x;
        const ay = a.y - before.y;
        const bx = b.x - after.x;
        const by = b.y - after.y;
        cross += ax * by - ay * bx;
        dot += ax * bx + ay * by;
    }
    /* Both zero means every matched point sits on the centre, which is
       not a shape and has no orientation. */
    if (cross === 0 && dot === 0) return null;
    return {
        angleDeg: (Math.atan2(cross, dot) * FULL_TURN_DEG) / (2 * Math.PI),
        from: before,
        to: after,
    };
}

function centreOf(
    points: ReadonlyMap<number, Vec2>,
    keys: readonly number[],
): Vec2 {
    let x = 0;
    let y = 0;
    for (const key of keys) {
        const point = points.get(key);
        if (point === undefined) continue;
        x += point.x;
        y += point.y;
    }
    return { x: x / keys.length, y: y / keys.length };
}
