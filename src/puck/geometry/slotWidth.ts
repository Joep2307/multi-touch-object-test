/* How wide one slot of the grid is, in degrees. Twelve slots is 30 degrees:
   a foot may sit 15 degrees off and still falls in the right one. */
export const slotWidth = (slots: number): number => 360 / slots;
