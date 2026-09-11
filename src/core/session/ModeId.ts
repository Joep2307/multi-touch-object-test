/* Which mode the session is in: Setup, Voting, Discussion.
 *
 * A mode narrows and never widens — it can take an action away from
 * a role but never grant one — which is what keeps the effective
 * permission a pure intersection and lets a validator check it at
 * boot instead of the table discovering it at four in the afternoon.
 */
export type ModeId = string & { readonly __brand: "ModeId" };
