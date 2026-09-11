import type { ContactPoint } from "./ContactPoint";

/* Every contact on the glass at one moment.
 *
 * The frame, not the individual touch, is the unit the model works in.
 * Recognition has to see all of a puck's feet at the same instant: fed
 * one touch at a time it would briefly believe in a three-foot object
 * that does not exist, name it, and then rename it a frame later.
 *
 * `points` is what is **down** — started or active — and `ended` is the
 * separate, one-frame announcement of what just came off. They are two
 * lists rather than one list with a status to filter on, and that is
 * not tidiness: a lifted foot mixed into `points` is indistinguishable
 * from a foot still on the glass to anything that counts them, so a
 * puck that had just lost a foot would read as complete for exactly one
 * frame. That bug was written, and this shape is what stopped it. The
 * status stays on the point because started-versus-active is still
 * worth knowing.
 *
 * Both lists are sorted by `id` so that two runs over the same input
 * produce byte-identical frames. That is what makes a recording
 * comparable and a test stable.
 */
export type ContactFrame = {
    readonly at: number;
    readonly points: readonly ContactPoint[];
    readonly ended: readonly ContactPoint[];
};
