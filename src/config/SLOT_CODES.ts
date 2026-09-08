/* The printable grid pucks: twelve slots of 30 degrees, six feet, on a ring
   of 34 or 26 mm.

   Three of the six feet are always the same -- slots 0, 1 and 3. That
   triplet is asymmetric, so you can see by eye which way the puck points
   (slot 0 is the arrow), and it keeps the codes far apart. The other three
   were searched for on two conditions: no code resembles itself when you
   turn it one slot further (`codeSelfSym` is 4 for all six), and no two
   codes lie closer than four slots apart over all turns. Four is what makes
   one missing foot plus one stray finger still unambiguous.

   These are a proposal, not a puck the table already knows: the build
   drawing prints them, and "Recognise puck" reads one onto one of the four
   pucks from the blueprint. That way the number of pucks never changes by
   measuring -- the same rule the ring and the triangle follow. */
export const SLOT_CODES = {
    slots: 12,
    /* The rings to print them on, in millimetres. */
    ringsMM: [34, 26],
    /* Slots 0·1·3 plus three of 5..11, as a bit mask. */
    codes: [459, 811, 1675, 2219, 2635, 3339],
};
