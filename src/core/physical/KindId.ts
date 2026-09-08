/* Which manufactured object this is — not which one of them.
 *
 * Branded for the same reason as `PhysicalId`: two pucks of the same
 * kind lie on the table at once, so confusing "what it is" with "which
 * one it is" is a real and silent bug.
 */
export type KindId = string & { readonly __brand: "KindId" };
