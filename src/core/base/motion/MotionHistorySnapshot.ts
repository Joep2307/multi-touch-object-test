import type { MotionSample } from "./MotionSample";

/* The bounded path available to consumers.
 *
 * The array is readonly because callers may render or inspect history,
 * but must not be able to rewrite the trait's past.
 */
export type MotionHistorySnapshot = {
    readonly points: readonly MotionSample[];
};
