/* How many bits are set. A grid code is at most sixteen slots wide, so the
   simple loop is fast enough and reads better than the bit tricks. */
export const popCount = (n: number): number => {
    let c = 0;
    for (let v = n >>> 0; v; v >>>= 1) c += v & 1;
    return c;
};
