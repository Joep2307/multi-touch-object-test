import { popCount } from "./popCount";
import { rotateCode } from "./rotateCode";

/* How far two codes lie apart, over all rotations: the number of slots
   where they differ, at their most favourable turn. Two pucks that lie
   fewer than three apart can be turned into each other by one missing foot
   plus one stray finger, and then the table can name the wrong puck. */
export function codeDistance(a: number, b: number, slots: number): number {
    let m = Infinity;
    for (let k = 0; k < slots; k++)
        m = Math.min(m, popCount(a ^ rotateCode(b, slots, k)));
    return m;
}
