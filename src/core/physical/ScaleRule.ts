/* Whether the size is part of the identity.
 *
 *   fixed  the measurements are the object; a look-alike at another
 *          size is a different kind
 *   free   the arrangement is the object, whatever size it comes in
 *
 * `fixed` for everything on this table, and that is load-bearing: the
 * same grid code on a 26 mm ring is a different puck from the one on
 * 34 mm, and `Position` scores size precisely so the two cannot
 * silence each other.
 */
export type ScaleRule = "fixed" | "free";
