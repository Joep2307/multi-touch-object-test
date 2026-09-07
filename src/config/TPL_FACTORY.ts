import type { Template } from "../types/Template";

/* The factory default: the four pucks from the build drawing. A puck you
   read in at the table overwrites the triangle of one of these four — so
   the number of pucks never changes through measuring. This original stays
   in place, so that "Clear measurements" has something to revert to. */
export const TPL_FACTORY: readonly Template[] = [
    { id: "puck-01", ratios: [0.62, 0.81], verdict: "good" },
    { id: "puck-02", ratios: [0.48, 0.76], verdict: "bad" },
    { id: "puck-03", ratios: [0.7, 0.93], verdict: "talk" },
    { id: "puck-04", ratios: [0.85, 0.9], verdict: "idea" },
];
