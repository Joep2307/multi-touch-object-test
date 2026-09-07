import type { PuckMemory } from "../types/PuckMemory";
import type { Track } from "../types/Track";

/* Pucks are tracked by their own sequence number, not by their type. That
   used to be the same thing: one puck per template. But then there could
   never be a second Problem puck on the table, and that's exactly what a
   table with two groups needs. Which one is which now follows from where it
   is (see `track`).

   `memory` is the state of pucks that just came off the table, at most
   CFG.puckMemoryMS old. A list, because the type is no longer a key. */
export const tracks = {
    map: new Map<string, Track>(),
    seq: 0,
    memory: [] as PuckMemory[],
};
