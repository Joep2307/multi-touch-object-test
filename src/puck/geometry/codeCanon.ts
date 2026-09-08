import { rotateCode } from "./rotateCode";

/* The same code however the puck happens to lie: the smallest of all its
   rotations. Two readings of one puck give the same canonical code even
   when the grid was read a slot further along, so this is what to count
   when you want to know whether a reading is stable. */
export function codeCanon(code: number, slots: number): number {
    let m = code;
    for (let k = 1; k < slots; k++)
        m = Math.min(m, rotateCode(code, slots, k));
    return m;
}
