import type { Vec2 } from "./Vec2";

/* The turn and the shift that carry one frame's feet onto the next
   frame's.
 *
 * Stated as an angle and two centroids rather than as a matrix,
 * because that is what the two callers actually want: the rotation
 * source reports `angleDeg` and throws the rest away, and the
 * footprint completion applies the whole motion to a foot it cannot
 * see. A matrix would make both of them unpack it again.
 *
 * To apply it to a point: subtract `from`, rotate by `angleDeg`, add
 * `to`.
 */
export type RigidMotion = {
    readonly angleDeg: number;
    /* The centroid of the matched points, in the earlier frame and in
       the later one. */
    readonly from: Vec2;
    readonly to: Vec2;
};
