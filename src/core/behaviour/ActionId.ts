/* Which free-standing rule this is: `cast_vote`, `place_mark`.
 *
 * Separate from `TransitionId` because the two are used differently
 * even though they share a grammar. A mode lists the actions it
 * allows; nothing lists transitions, because a transition is only
 * reachable from the state it leaves.
 */
export type ActionId = string & { readonly __brand: "ActionId" };
