/* How a kind is recognised, which decides which solver and which
   heading source it uses.
 *
 *   triad   three feet, isosceles — the standard for anything new
 *   ring    feet spread around a circle with one deliberate gap
 *   slot    feet in a twelve-slot grid; which slots are filled is the
 *           identity
 *   coded   a printed pattern, no feet at all
 *
 * `ring` and `slot` are legacy: supported indefinitely, but no new
 * objects are made in those shapes. `coded` has no recogniser yet.
 */
export type KindFamily = "triad" | "ring" | "slot" | "coded";
