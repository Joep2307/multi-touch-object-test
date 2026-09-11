import type { SensedContact } from "../../contact";
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
 *
 * A source may remember what it decided. `reset` is when it must
 * forget: the object has left the glass, and the next one to arrive is
 * a different object even if it lands in the same place.
 */
export abstract class HeadingSource {
    abstract readonly id: string;

    abstract heading(
        points: readonly SensedContact[],
        centre: Vec2,
    ): { headingDeg: number; reference: Vec2 } | null;

    /* Most sources decide afresh every frame and have nothing to
       forget, so this does nothing unless a source says otherwise. */
    reset(): void {}
}
