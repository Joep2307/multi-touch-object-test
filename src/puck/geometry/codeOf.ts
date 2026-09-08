/* Occupied slots as a bit mask: slot 3 becomes bit 3. */
export const codeOf = (idx: number[]): number => {
    let c = 0;
    for (const i of idx) c |= 1 << i;
    return c >>> 0;
};
