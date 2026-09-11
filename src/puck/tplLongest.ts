import { CFG } from "../config";
import type { Template } from "../types";

/* The longest side belongs to the puck, not to the table: cut tape is never
   exactly 60 mm, and two pucks are allowed to differ. `CFG.longestSideMM` is
   the fallback for a puck that has never been learned. */
export const tplLongest = (t: Template | null | undefined): number =>
    t && Number.isFinite(t.longestMM) && (t.longestMM as number) > 0
        ? (t.longestMM as number)
        : CFG.longestSideMM;
