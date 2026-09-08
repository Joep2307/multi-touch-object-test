/* A point or a direction in screen pixels.
 *
 * The core has its own, rather than reaching for `src/types/Point`,
 * and that is the boundary working as intended: the moment the core
 * imports from the app tree it stops being portable to Rust and stops
 * being testable without the table. One type declaration is a cheap
 * price for that.
 *
 * Readonly, because a trait must be able to hand its answer out
 * without the caller being able to reach back in and change it.
 */
export type Vec2 = {
    readonly x: number;
    readonly y: number;
};
