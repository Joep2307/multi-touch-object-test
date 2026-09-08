import type { DuoMeasure } from "./DuoMeasure";
import type { RingMeasure } from "./RingMeasure";
import type { SlotMeasure } from "./SlotMeasure";
import type { TriMeasure } from "./TriMeasure";

/* The median of a learning series: what actually goes into a template. */
export type LearnMeasure = TriMeasure | RingMeasure | SlotMeasure | DuoMeasure;
