import { noise } from "../../state/noise";

/* Holding still is over. Every foot moves to the middle of where it was
   seen while settling, and the counting starts from zero.

   Recentring is what keeps the measurement honest. An anchor taken from a
   single frame carries that frame's noise, so on a jittery table the
   points sit lopsided around it and the ones furthest out fall past the
   matching distance -- the spread then comes out smaller than it is, which
   is the one direction this measurement must never err in. */
export function armNoise(now: number): void {
    noise.phase = "run";
    noise.t0 = now;
    noise.frames = 0;
    noise.extra = 0;
    noise.snapSum = 0;
    noise.snapN = 0;
    noise.radii = [];
    noise.codes = new Map();
    for (const f of noise.feet) {
        if (f.n) {
            f.ax = f.sx / f.n;
            f.ay = f.sy / f.n;
        }
        f.n = 0;
        f.sx = 0;
        f.sy = 0;
        f.sxx = 0;
        f.syy = 0;
        f.miss = 0;
    }
}
