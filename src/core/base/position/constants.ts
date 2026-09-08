/* Below this the two-by-two system is singular and the feet are, to
   the precision we have, on a straight line. There is no circle
   through them and a fit would return a centre somewhere off-screen. */
export const CIRCLE_FIT_MIN_DET = 1e-9;

/* Confidence, and everything derived from it, is clamped to this. */
export const CONFIDENCE_MAX = 1;
export const CONFIDENCE_MIN = 0;
