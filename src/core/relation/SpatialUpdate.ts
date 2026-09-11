import type { SpatialRelation } from "./SpatialRelation";

/* What one frame's worth of looking at the whole table produced.
 *
 * `entered` is separate from `relations` because a crossing is an
 * event and a relation is a state. Everything that wants to know where
 * things stand reads `relations`; the one thing that wants to announce
 * a change reads `entered`, and does not have to diff the list itself
 * to find it.
 *
 * The index returns both rather than publishing, so that it stays a
 * measurement and nothing about it has to know a bus exists. What to
 * announce, and to whom, is a decision one layer up.
 */
export type SpatialUpdate = {
    readonly relations: readonly SpatialRelation[];
    /* Pairs that were far apart and now are not, in this frame only. */
    readonly entered: readonly SpatialRelation[];
};
