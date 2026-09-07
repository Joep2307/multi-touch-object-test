import { ringStart } from "./ringStart";

/* Which segment of a ring with `n` options lies at this angle. */
export const ringIndexOf = (angle: number, n: number): number => {
    if (!n) return 0;
    let a = (angle - ringStart(n)) / (Math.PI * 2);
    a = ((a % 1) + 1) % 1;
    return Math.floor(a * n) % n;
};
