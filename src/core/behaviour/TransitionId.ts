/* Which move between two states this is.
 *
 * Named at all because a transition that fires when it should not is
 * the hardest thing to find in a state machine, and a trace that can
 * only say "something moved it to Voted" is no help.
 */
export type TransitionId = string & { readonly __brand: "TransitionId" };
