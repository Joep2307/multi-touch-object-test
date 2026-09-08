import type { NoiseFoot } from "../types/NoiseFoot";
import type { NoiseReport } from "../types/NoiseReport";

/* The running noise measurement. Four phases: waiting for a puck, holding
   still, counting frames, and the finished report -- which stays on screen
   until another puck lies still, because at the table you want to read it
   with your hands free. */
export const noise = {
    phase: "wait" as "wait" | "hold" | "run" | "done",
    t0: 0,
    frames: 0,
    slip: 0,
    feet: [] as NoiseFoot[],
    radii: [] as number[],
    snapSum: 0,
    snapN: 0,
    codes: new Map<number, number>(),
    extra: 0,
    report: null as NoiseReport | null,
};
