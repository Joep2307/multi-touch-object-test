import type { Side } from "../types/Side";

/* The analysis window: which side it opened on, how it's rotated, and for
   which state of the pins it was last built. */
export const analytics = {
    side: "a" as Side,
    rotation: 0,
    revision: -1,
};
