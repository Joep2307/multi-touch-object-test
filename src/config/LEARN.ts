/* Measuring a puck: how long to hold still, how much a marker is allowed
   to shake before the series restarts, and how many measurements the
   median needs at minimum.

   `STILL_MM` is millimetres on the glass, because "still" is a fact about
   the hand and not about the panel. It was 9 px, tuned on the 43 in table
   at 2.02 px/mm; on the 55 in panel the same 9 px would have been 5.7 mm
   and the measurement would have started accepting a shakier hand. */
export const LEARN = { HOLD_MS: 900, STILL_MM: 4.5, MIN_SAMPLES: 12 };
