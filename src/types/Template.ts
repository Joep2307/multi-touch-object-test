import type { Verdict } from "./Verdict";

/* One puck's triangle. `ratios` are the two short sides divided by the
   longest; `longestMM` belongs to the puck, not the table — cut tape is
   never exactly 60 mm. If it's missing, CFG.longestSideMM applies. */
export interface Template {
    id: string;
    ratios: [number, number];
    verdict: Verdict;
    longestMM?: number;
    learnedAt?: string | null;
    /* Learned in puck mode, in place of one of the four from the blueprint. */
    own?: boolean;
}
