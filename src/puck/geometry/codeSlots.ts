/* The other way round: which slots a code occupies, in ascending order. */
export const codeSlots = (code: number, slots: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < slots; i++) if ((code >>> i) & 1) out.push(i);
    return out;
};
