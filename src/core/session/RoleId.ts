/* Which part an object is playing: voter, moderator, marker.
 *
 * A role is not a kind. The same wooden puck is a Voter in one mode
 * and a Player in the next, and every question worth asking about it
 * is a question about the role rather than about the wood. Branding
 * the two apart is what keeps that distinction from eroding one
 * `string` at a time.
 *
 * This folder is otherwise phase D's; see the note in
 * `behaviour/StateId.ts`.
 */
export type RoleId = string & { readonly __brand: "RoleId" };
