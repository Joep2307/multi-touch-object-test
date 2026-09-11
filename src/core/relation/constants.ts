/* Within reach: close enough that a person put them there on purpose.
 *
 * Sixty millimetres is roughly a puck's width of clear space between
 * two of them, which is about what "next to each other" looks like on
 * a table this size. */
export const NEAR_MM = 60;

/* And the distance at which they stop counting as near.
 *
 * Deliberately larger than `NEAR_MM`, and the gap between the two *is*
 * the hysteresis. A single threshold makes two pucks sitting exactly
 * at it flicker in and out of being near for as long as they lie
 * there, which on this table means a rule firing sixty times a second.
 * Entering takes 60 mm; leaving takes 80. */
export const FAR_MM = 80;

/* How close two rims have to be to count as touching rather than
   merely overlapping or merely near. Two millimetres is under a
   pixel's worth of doubt at the table's measured scale. */
export const TOUCH_TOLERANCE_MM = 2;
