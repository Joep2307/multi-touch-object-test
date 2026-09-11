/* Whether this signature still matches when the object is turned.
 *
 *   free   any angle; the arrangement is what identifies it
 *   fixed  only at the angle it was authored at
 *
 * Every object on this table is `free` — you put a puck down whichever
 * way it lands. `fixed` exists for the printed patterns that phase A
 * does not build: a code stuck to the table itself has one orientation
 * and reading it upside down is a different code, not the same one
 * rotated.
 */
export type OrientationRule = "free" | "fixed";
