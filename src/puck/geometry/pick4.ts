/* The five groups of four out of a group of five: which foot is missing. */
export const pick4 = <T>(a: T[]): T[][] =>
    a.map((_, i) => a.filter((_, j) => j !== i));
