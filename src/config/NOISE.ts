/* Measuring how steadily the glass reports the feet of a puck.

   `FRAMES` is four seconds at sixty frames a second -- long enough for the
   spread to settle, short enough to hold a puck still for. `MATCH_MM` is
   how far a contact point may sit from where that foot was when the series
   started before it counts as a different point; `MOVE_MM` is when the puck
   itself has moved. That last one has to hold for `SLIP_FRAMES` frames in a
   row before the series starts over: on a noisy table a single frame
   wanders off now and then, and restarting on that would leave the
   measurement hanging exactly where the answer matters most. */
export const NOISE = {
    FRAMES: 240,
    HOLD_MS: 400,
    MATCH_MM: 10,
    MOVE_MM: 5,
    SLIP_FRAMES: 6,
    MIN_PTS: 3,
    MAX_PTS: 9,
};
