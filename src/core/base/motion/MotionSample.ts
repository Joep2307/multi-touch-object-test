/* One remembered place on the object's path.
 *
 * Coordinates are copied from `Move` rather than retaining its `to`
 * object. A motion history is the past, so a later frame must never be
 * able to
 * change a point that has already been recorded.
 */
export type MotionSample = {
    readonly x: number;
    readonly y: number;
    readonly at: number;
};
