import { popCount } from "./popCount";
import { rotateCode } from "./rotateCode";

/* The grid version of a nearly isosceles triangle: does this code look like
   itself when you turn it a slot further? Then the table cannot see which
   way is forward, the puck flips from frame to frame and the ring menu
   stalls. The bigger the number, the safer; four is what the printed codes
   have. */
export function codeSelfSym(code: number, slots: number): number {
    let m = Infinity;
    for (let k = 1; k < slots; k++)
        m = Math.min(m, popCount(code ^ rotateCode(code, slots, k)));
    return m;
}
