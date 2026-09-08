import type { TailPoint } from "./TailPoint";

/* The bounded path available to consumers.
 *
 * The array is readonly because callers may render or inspect history,
 * but must not be able to rewrite the trait's past.
 */
export type TailSnapshot = {
    readonly points: readonly TailPoint[];
};
