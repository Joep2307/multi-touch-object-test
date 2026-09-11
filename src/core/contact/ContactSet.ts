import type { SensedContact } from "./SensedContact";

/* The contacts believed to belong to one object.
 *
 * A `ContactFrame` is everything on the glass; a `ContactSet` is the
 * three feet the matcher decided are one puck. It is the input to the
 * whole base: `Position` reads it for the middle point, `Direction`
 * for the nose, and everything else derives from those two.
 *
 * The points are `SensedContact`s rather than `ContactPoint`s, and
 * that is the tier boundary showing: whether a touch is new or gone is
 * a fact about the frame it arrived in, and nothing that measures a
 * shape has any use for it. A trait that needed it would be reaching
 * across the boundary, and would have to say so.
 *
 * Deliberately not a class and deliberately carrying no identity. Which
 * object this set belongs to is decided above, in phase 5, and putting
 * a `PhysicalId` here now would mean the base could only ever be fed by
 * something that had already solved identity — which is exactly the
 * knot the current `Track` ties.
 */
export type ContactSet = {
    readonly at: number;
    readonly points: readonly SensedContact[];
};
