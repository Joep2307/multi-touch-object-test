import type { DuoSample } from "./DuoSample";
import type { RingSample } from "./RingSample";
import type { TriSample } from "./TriSample";

/* One measurement from the series whose median becomes the puck. */
export type LearnSample = TriSample | RingSample | DuoSample;
