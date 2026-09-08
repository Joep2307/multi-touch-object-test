import type { ContactPoint } from "./ContactPoint";

/* The contacts believed to belong to one object.
 *
 * A `ContactFrame` is everything on the glass; a `ContactSet` is the
 * three feet the matcher decided are one puck. It is the input to the
 * whole base: `Position` reads it for the middle point, `Direction`
 * for the nose, and everything else derives from those two.
 *
 * Deliberately not a class and deliberately carrying no identity. Which
 * object this set belongs to is decided above, in phase 5, and putting
 * a `PhysicalId` here now would mean the base could only ever be fed by
 * something that had already solved identity — which is exactly the
 * knot the current `Track` ties.
 */
export type ContactSet = {
    readonly at: number;
    readonly points: readonly ContactPoint[];
};
