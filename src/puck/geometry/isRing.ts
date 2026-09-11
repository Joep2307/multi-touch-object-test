import type { Template } from "../../types";

/* A ring puck carries five angles; a taped puck carries side ratios. */
export const isRing = (t: Template | null | undefined): boolean =>
    Array.isArray(t?.angles) && t.angles.length === 5;
