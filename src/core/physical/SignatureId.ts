/* Which of a kind's ways of being recognised this is.
 *
 * A kind may be recognisable in more than one way — three feet, or
 * five on a ring — and an instance runs on exactly one of them. The id
 * is what lets a reading say which, so a puck that is being read the
 * wrong way is visible rather than merely wrong.
 */
export type SignatureId = string & { readonly __brand: "SignatureId" };
