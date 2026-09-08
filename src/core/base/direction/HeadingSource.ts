import type { ContactPoint } from "../../contact/ContactPoint";
import type { Vec2 } from "../Vec2";

/* How the nose of an object is derived from its feet.
 *
 * The four kinds of object on this table answer this in genuinely
 * different ways — the apex of a triangle, the widest gap in a ring,
 * the phase of a grid code, the orientation of a printed pattern — so
 * this is the seam where a new kind of object plugs in without any
 * other file changing.
 *
 * Returns degrees, or `null` when this frame cannot say. Null is a
 * real answer here: a three-foot puck seen as very nearly equilateral
 * has no distinguishable nose, and inventing one would make the puck
 * appear to snap between orientations.
 */
export abstract class HeadingSource {
    abstract readonly id: string;

    abstract heading(
        points: readonly ContactPoint[],
        centre: Vec2,
    ): { headingDeg: number; reference: Vec2 } | null;
}
