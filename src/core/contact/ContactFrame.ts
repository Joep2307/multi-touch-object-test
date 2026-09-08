import type { ContactPoint } from "./ContactPoint";

/* Every contact on the glass at one moment.
 *
 * The frame, not the individual touch, is the unit the model works in.
 * Recognition has to see all of a puck's feet at the same instant: fed
 * one touch at a time it would briefly believe in a three-foot object
 * that does not exist, name it, and then rename it a frame later.
 *
 * `points` is sorted by `id` so that two runs over the same input
 * produce byte-identical frames. That is what makes a recording
 * comparable and a test stable.
 */
export type ContactFrame = {
    readonly at: number;
    readonly points: readonly ContactPoint[];
};
