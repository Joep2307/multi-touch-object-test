import { norm360 } from "./norm360";

/* The gaps between the feet, clockwise. This is what makes a ring puck
   recognisable: rotate the puck and all five angles move along, but the
   gaps between them stay put. */
export const gapsOf = (angles: number[]): number[] => {
    const a = [...angles].map(norm360).sort((x, y) => x - y);
    return a.map((v, i) =>
        norm360((i === a.length - 1 ? a[0] + 360 : a[i + 1]) - v),
    );
};
