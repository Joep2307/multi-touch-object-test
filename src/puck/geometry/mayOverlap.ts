import type { Template } from "../../types/Template";
import { tplSpanMM } from "./tplSpanMM";

/* Two discs cannot lie on top of each other -- except the duo, which is
   made to. Both halves are marked `nest`, and they differ enough in size
   for the recognition to tell them apart. */
export const mayOverlap = (
    a: Template | null | undefined,
    b: Template | null | undefined,
): boolean => {
    if (!(a && b && a.nest && b.nest && a.id !== b.id)) return false;
    const sa = tplSpanMM(a),
        sb = tplSpanMM(b);
    return Math.abs(sa - sb) > Math.max(sa, sb) * 0.25;
};
