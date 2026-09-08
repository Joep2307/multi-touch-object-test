import { FULL_TURN_DEG, RAY_MIN_COMPONENT } from "./constants";
import type { ScreenBounds } from "../ScreenBounds";
import type { Vec2 } from "../Vec2";

/* The line out of the object's nose, and where it leaves the screen.
 *
 * This is the "point going to the other side of the screen" from the
 * brief, as an object rather than as a number. It exists on its own
 * because pointing is going to be a real interaction — a puck aimed
 * at something, a beam across the map — and every one of those wants
 * the same answer: given this heading, where does the ray hit the
 * edge?
 *
 * Slab intersection against the four edges, taking the nearest hit in
 * front of the origin. A component below `RAY_MIN_COMPONENT` means
 * the ray runs parallel to that pair of edges and never meets them,
 * which is a real case — a perfectly horizontal puck — and not an
 * error.
 */
export class DirectionRay {
    constructor(
        readonly origin: Vec2,
        readonly unit: Vec2,
    ) {}

    static fromHeading(origin: Vec2, headingDeg: number): DirectionRay {
        const rad = (headingDeg * 2 * Math.PI) / FULL_TURN_DEG;
        return new DirectionRay(origin, {
            x: Math.cos(rad),
            y: Math.sin(rad),
        });
    }

    /* Where the ray leaves the screen, or `null` when the origin is
       already outside it. */
    exitPoint(bounds: ScreenBounds): Vec2 | null {
        const { x, y } = this.origin;
        if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) {
            return null;
        }
        let best = Number.POSITIVE_INFINITY;
        const consider = (t: number): void => {
            if (t > 0 && t < best) best = t;
        };
        if (Math.abs(this.unit.x) > RAY_MIN_COMPONENT) {
            consider((0 - x) / this.unit.x);
            consider((bounds.width - x) / this.unit.x);
        }
        if (Math.abs(this.unit.y) > RAY_MIN_COMPONENT) {
            consider((0 - y) / this.unit.y);
            consider((bounds.height - y) / this.unit.y);
        }
        if (!Number.isFinite(best)) return null;
        return { x: x + this.unit.x * best, y: y + this.unit.y * best };
    }
}
