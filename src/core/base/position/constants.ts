/* Below this the two-by-two system is singular and the feet are, to
   the precision we have, on a straight line. There is no circle
   through them and a fit would return a centre somewhere off-screen. */
export const CIRCLE_FIT_MIN_DET = 1e-9;

/* Confidence, and everything derived from it, is clamped to this. */
export const CONFIDENCE_MAX = 1;
export const CONFIDENCE_MIN = 0;

/* How far the feet must wrap around the circle they claim to lie on,
   as a fraction of that circle's diameter.
 *
 * Three points fit exactly one circle and five nearly do, so a circle
 * fit always succeeds — including on points strung out along a shallow
 * arc, where it returns an enormous circle passing near all of them.
 * The residual of such a fit is *tiny*, which is the trap: measured
 * against the fitted radius it looks like a perfect ring, and
 * `PxPerMMEstimator` is gated on exactly that number.
 *
 * Five contacts on a 400 px line with sub-pixel scatter fit a circle
 * of radius 3790 px with a residual of 2, scoring 0.995 — and one such
 * frame was enough to drag the table's shared scale to its clamp, so
 * every drawn ring on every object was 12% oversized for the next four
 * seconds.
 *
 * The widest gap between any two feet is what catches it, because it
 * needs no scale and no template. Five feet evenly spread on a ring
 * span 0.95 of its diameter; three at 120° span 0.87; the degenerate
 * fit above spans 0.05. A half-diameter is comfortably below anything
 * real and far above anything strung out. */
export const CIRCLE_FIT_MIN_SPAN = 0.5;
