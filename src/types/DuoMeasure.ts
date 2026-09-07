import type { TriMeasure } from "./TriMeasure";

/* The duo measured in one go: the outer triangle and the inner one. */
export interface DuoMeasure {
    duo: true;
    ring?: false;
    o: Omit<TriMeasure, "ring" | "duo">;
    i: Omit<TriMeasure, "ring" | "duo">;
}
