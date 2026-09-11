/* Which gesture definition this is.
 *
 * Not the same as the `Gesture` it recognises: a programme may have
 * two ways of recognising a tap — a quick one for a token and a slower
 * one for a dial someone is being careful with — and a rule that
 * triggers on one of them needs to say which.
 */
export type GestureId = string & { readonly __brand: "GestureId" };
