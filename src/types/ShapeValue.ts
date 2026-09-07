/* A measured puck shape on its way into a template: either a ring or a
   triangle. Both halves are optional so one value can carry either -- see
   `applyShape`, which decides which of the two it is. */
export interface ShapeValue {
    angles?: number[];
    ringMM?: number;
    ratios?: [number, number];
    longestMM?: number;
}
