/* Where a contact stands in its own short life.
 *
 *   started  first frame this id appears
 *   active   seen before, still down
 *   ended    lifted; present in exactly one frame so that a consumer
 *            can see it go
 *
 * The model calls these Started, Active and Ended. They are lowercase
 * here for the same reason `PresenceState` and `TapKind` are: a string
 * union that is read in code far more often than it is read on paper.
 *
 * `ended` earns the enumeration. Without it a lifted finger simply
 * stops appearing, and everything downstream has to keep its own copy
 * of the previous frame to notice — which is six copies of the same
 * bookkeeping, each able to disagree with the others by a frame.
 */
export type ContactStatus = "started" | "active" | "ended";
