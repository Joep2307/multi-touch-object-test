import type { Template } from "../types/Template";
import { isRing } from "./geometry/isRing";

/* A copy that doesn't share its shape array with the original. */
export const cloneTpl = (t: Template): Template => ({
    ...t,
    ...(isRing(t)
        ? { angles: [...(t.angles ?? [])] }
        : { ratios: [...(t.ratios ?? [1, 1])] as [number, number] }),
});
