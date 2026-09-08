/* The printed puck is 80 mm across. `CFG.puckRadiusMM` says 45, which
   would draw a ring 90 mm wide on an 80 mm object — the reason the
   animation and the physical puck do not line up today. Templates that
   carry their own `radiusMM` (the duo's small half) keep it; everything
   else gets this. */
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
