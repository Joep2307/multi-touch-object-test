import type { Template } from "../types";
/* A copy that doesn't share its shape array with the original. Only the
   arrays that are really there are copied: a grid puck has neither, and
   handing it an empty triangle would make it look like one. */
export const cloneTpl = (t: Template): Template => ({
    ...t,
    ...(t.angles ? { angles: [...t.angles] } : {}),
    ...(t.ratios
        ? { ratios: [t.ratios[0], t.ratios[1]] as [number, number] }
        : {}),
});
