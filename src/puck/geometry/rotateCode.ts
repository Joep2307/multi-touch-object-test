/* The same code, turned `k` slots further along the ring. This is what
   makes the recognition rotation-free: the table doesn't ask which way the
   puck lies, it tries all the turns and keeps the one that fits. */
export const rotateCode = (code: number, slots: number, k: number): number => {
    const mask = (1 << slots) - 1;
    const s = ((k % slots) + slots) % slots;
    return (((code << s) | (code >>> (slots - s))) & mask) >>> 0;
};
