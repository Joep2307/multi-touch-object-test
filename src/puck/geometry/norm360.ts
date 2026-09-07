/* An angle in degrees, folded into [0, 360). Values a hair below 360 are
   snapped to 0 so a gap pattern never flips between 0 and 359.99. */
export const norm360 = (a: number): number => {
    const v = ((a % 360) + 360) % 360;
    return v < 1e-9 || v > 360 - 1e-9 ? 0 : v;
};
