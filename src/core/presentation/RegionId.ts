/* Which area of the table this is: the voting area, the discard pile.
 *
 * Branded like every other definition id, and for the same reason:
 * region ids and kind ids are both strings out of the same file, and
 * the compiler is the only reader that will ever notice them being
 * swapped.
 */
export type RegionId = string & { readonly __brand: "RegionId" };
