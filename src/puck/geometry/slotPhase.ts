import { slotWidth } from "./slotWidth";

/* Where the grid starts on the glass. The puck lies at any angle, so the
   slots do too; what is fixed is that all the feet sit at a whole number of
   slots from each other. Fold every angle into one slot and take the
   circular mean of that -- with six feet the noise of a single one weighs a
   sixth. The result is the offset of slot 0, in degrees between 0 and one
   slot. */
export function slotPhase(angles: number[], slots: number): number {
    const w = slotWidth(slots);
    let cs = 0,
        sn = 0;
    for (const a of angles) {
        const th = (2 * Math.PI * (((a % w) + w) % w)) / w;
        cs += Math.cos(th);
        sn += Math.sin(th);
    }
    const p = (Math.atan2(sn, cs) / (2 * Math.PI)) * w;
    return ((p % w) + w) % w;
}
