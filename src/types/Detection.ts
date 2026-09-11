import type { ScaleReading } from "./ScaleReading";
import type { Template } from "./Template";

/* One recognised puck in one frame: which kind, where, how rotated.
   `held` marks a puck that was kept alive on four feet instead of five. */
export interface Detection {
    tpl: Template;
    conf: number;
    x: number;
    y: number;
    angle: number;
    /* Indices into the contact array passed to `recognise()`. The old
       tracker only needs the fitted pose; the bridge needs the actual
       feet so the new Base can measure the same object independently. */
    contactIndices: readonly number[];
    held?: boolean;
    /* This puck as a ruler: a known length, measured. Absent when the
       template's millimetres were themselves measured at the table, and
       absent on a puck held alive with a foot missing -- see
       `readScale`. */
    scale?: ScaleReading;
}
