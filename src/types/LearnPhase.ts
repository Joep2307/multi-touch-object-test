/* Where the measurement window stands: waiting for three points, waiting
   for the glass to be empty, holding still, measured, or saved. */
export type LearnPhase = "wait" | "clear" | "hold" | "done" | "saved";
