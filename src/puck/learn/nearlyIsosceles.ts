/* A nearly isosceles triangle has no clear front: which corner is the
   "anchor" then flips from frame to frame, and with it the angle the whole
   ring menu is oriented on. Better to flag this now than discover it later
   at the table. */
export const nearlyIsosceles = (r0: number, r1: number): boolean =>
    Math.abs(r0 - r1) < 0.06 || 1 - r1 < 0.06;
