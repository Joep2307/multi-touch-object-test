/* Where an object stands, as the rest of the system sees it.
 *
 *   Detected  on the glass and measured this frame
 *   Missing   believed to be here but not measured, or lifted and
 *             still remembered
 *   Removed   not here, and putting it back makes a new object
 *
 * Three states, projected from `Presence`'s four. That is deliberate,
 * and it is the one place the model is deliberately coarser than the
 * code underneath it: `Presence` needs the difference between "lifted"
 * and "gone" to decide whether a returning puck is the same puck,
 * while nothing above it does — a rule that fires on Missing does not
 * care which kind of missing. Keeping the distinction where it is used
 * and dropping it where it is not is what stops every consumer having
 * to know the presence state machine.
 */
export type InstanceStatus = "detected" | "missing" | "removed";
