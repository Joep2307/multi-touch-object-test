/* The printed puck is 80 mm across, and both pipelines now say so:
   `CFG.puckRadiusMM` is the 40 mm half of it. This stays a number of
   its own because a kind's outer edge is not the drawing's setting —
   templates that carry their own `radiusMM` (the duo's small half)
   keep it; everything else gets this. */
export const DEFAULT_OUTER_DIAMETER_MM = 80;

/* How far a returning puck may have moved and still be the same one.
   Roughly half a puck: put it back overlapping where it was and it is
   the same object; put it down clearly elsewhere and it is a new act. */
export const MAX_RETURN_PX = 120;

/* Above this the old and new pipelines disagree enough to be worth
   reporting. Two millimetres at four pixels per millimetre — about the
   noise a real foot makes on a real table. */
export const PARITY_CENTRE_PX = 8;

/* A degree and a half. Below that the two are measuring the same
   angle by different routes; above it one of them is wrong. */
export const PARITY_ANGLE_DEG = 1.5;

/* How far a foot may sit from where a template says it should, in
   millimetres. The old matchers do not express a tolerance in these
   terms at all — they score a shape and take the best fit — so this is
   a description of the templates rather than a threshold anything
   currently enforces. It is what a signature has to state, and 5 mm is
   the figure the model uses. */
export const TEMPLATE_TOLERANCE_MM = 5;
