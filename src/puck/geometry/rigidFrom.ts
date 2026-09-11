import type { Point, RigidMove } from "../../types";

/* The turn and shift that best explain how a set of matched points moved.

   `before[i]` and `after[i]` must be the same physical point. Centre both
   sets on their own mean, and the best angle is the arctangent of the
   summed cross products over the summed dot products -- exact, one pass, no
   search. Two points are enough; one is not, because a single point is the
   same point at every angle. */
export function rigidFrom(
    before: readonly Point[],
    after: readonly Point[],
): RigidMove | null {
    const n = before.length;
    if (n < 2 || after.length !== n) return null;
    let fx = 0,
        fy = 0,
        tx = 0,
        ty = 0;
    for (let i = 0; i < n; i++) {
        const b = before[i],
            a = after[i];
        if (!b || !a) return null;
        fx += b.x;
        fy += b.y;
        tx += a.x;
        ty += a.y;
    }
    const from = { x: fx / n, y: fy / n },
        to = { x: tx / n, y: ty / n };
    let cross = 0,
        dot = 0;
    for (let i = 0; i < n; i++) {
        const b = before[i],
            a = after[i];
        if (!b || !a) return null;
        const bx = b.x - from.x,
            by = b.y - from.y;
        const ax = a.x - to.x,
            ay = a.y - to.y;
        cross += bx * ay - by * ax;
        dot += bx * ax + by * ay;
    }
    /* Both zero means every matched point sits on the middle, which is not
     a shape and has no orientation. */
    if (cross === 0 && dot === 0) return null;
    return { rot: Math.atan2(cross, dot), from, to };
}
