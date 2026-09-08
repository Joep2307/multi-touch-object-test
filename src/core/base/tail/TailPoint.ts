/* One remembered place on the object's path.
 *
 * Coordinates are copied from `Move` rather than retaining its `to`
 * object. A tail is history, so a later frame must never be able to
 * change a point that has already been recorded.
 */
export type TailPoint = {
    readonly x: number;
    readonly y: number;
    readonly at: number;
};
