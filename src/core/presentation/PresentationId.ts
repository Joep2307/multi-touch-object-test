/* Which drawing to use for something.
 *
 * A presentation says what a thing looks like and binds to what it
 * reads — never why any of it changed. Kinds, states and modes all
 * point at one, which is why the id lives here rather than on any of
 * them.
 *
 * This folder is otherwise phase E's; see the note in
 * `behaviour/StateId.ts`.
 */
export type PresentationId = string & { readonly __brand: "PresentationId" };
