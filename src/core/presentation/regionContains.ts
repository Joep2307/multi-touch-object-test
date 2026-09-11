import type { Vec2 } from "../base";
import type { RegionShape } from "./RegionShape";

/* Is this point inside this shape, allowing for a margin?
 *
 * The margin is what makes hysteresis possible: ask with a negative
 * margin to enter and a positive one to leave, and a puck resting on
 * the edge stays where it was put instead of crossing in and out on
 * sensor noise.
 *
 * Everything is in millimetres from the table's origin, because a
 * region is a place on a physical table that people reach across.
 */
export function regionContains(
    shape: RegionShape,
    pointMM: Vec2,
    marginMM = 0,
): boolean {
    switch (shape.kind) {
        case "circle": {
            const distance = Math.hypot(
                pointMM.x - shape.centreMM.x,
                pointMM.y - shape.centreMM.y,
            );
            return distance <= shape.radiusMM + marginMM;
        }
        case "rect": {
            const halfWidth = shape.widthMM / 2 + marginMM;
            const halfHeight = shape.heightMM / 2 + marginMM;
            return (
                Math.abs(pointMM.x - shape.centreMM.x) <= halfWidth &&
                Math.abs(pointMM.y - shape.centreMM.y) <= halfHeight
            );
        }
        case "polygon":
            return inPolygon(shape.pointsMM, pointMM, marginMM);
    }
}

/* Ray casting, with the margin applied as a distance to the outline
   rather than as an inflated polygon. Inflating a polygon properly is
   a real piece of geometry and this is a five-millimetre band: being
   within the band of an edge counts as inside, which is what the
   hysteresis needs and all it needs. */
function inPolygon(
    points: readonly Vec2[],
    point: Vec2,
    marginMM: number,
): boolean {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const a = points[i];
        const b = points[j];
        if (a === undefined || b === undefined) continue;
        const crosses = a.y > point.y !== b.y > point.y;
        if (
            crosses &&
            point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
        ) {
            inside = !inside;
        }
        if (marginMM !== 0 && nearSegment(a, b, point) <= Math.abs(marginMM)) {
            return marginMM > 0;
        }
    }
    return inside;
}

function nearSegment(a: Vec2, b: Vec2, point: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
    const t = Math.max(
        0,
        Math.min(
            1,
            ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared,
        ),
    );
    return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}
