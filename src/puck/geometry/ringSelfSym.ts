import { gapErr } from "./gapErr";
import { shiftGaps } from "./shiftGaps";

/* The ring equivalent of a nearly isosceles triangle: if the pattern looks
   like itself when you turn it one foot further, the front swaps every frame
   and the ring menu stalls. The smaller the number, the worse. */
export function ringSelfSym(gaps: number[]): number {
    let m = Infinity;
    for (let s = 1; s < gaps.length; s++)
        m = Math.min(m, gapErr(gaps, shiftGaps(gaps, s)));
    return m;
}
