/* The same ring of gaps, started one foot further along. */
export const shiftGaps = (a: number[], s: number): number[] =>
    a.map((_, i) => a[(i + s) % a.length] ?? 0);
