/* Mean absolute difference between two gap patterns, in degrees. */
export const gapErr = (a: number[], b: number[]): number => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
    return s / a.length;
};
