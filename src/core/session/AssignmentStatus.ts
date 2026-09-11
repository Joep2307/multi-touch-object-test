/* Where a role assignment stands.
 *
 *   active   this object holds the role now
 *   queued   it asked and the role was full; it gets one when a
 *            place opens
 *   expired  the object was away long enough to lose it
 *   removed  taken away, by a rule or by another object arriving
 *
 * `queued` and `expired` are the two that earn their place. A physical
 * table cannot stop a ninth block appearing when there are eight
 * voters, so what happens to the ninth has to be sayable; and a puck
 * picked up to point at something has to keep its part while it is off
 * the glass, or every gesture would cost someone their vote.
 */
export type AssignmentStatus = "active" | "queued" | "expired" | "removed";
