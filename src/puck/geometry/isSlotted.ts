import type { Template } from "../../types";

/* A grid puck carries a number of slots and a code; a ring puck carries
   five angles and a taped puck side ratios. */
export const isSlotted = (t: Template | null | undefined): boolean =>
    !!t &&
    Number.isFinite(t.slots) &&
    (t.slots as number) >= 4 &&
    (t.slots as number) <= 24 &&
    Number.isFinite(t.code) &&
    (t.code as number) > 0;
