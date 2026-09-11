import type { ScaleReading } from "./ScaleReading";
import type { Template } from "./Template";
import type { TrackFoot } from "./TrackFoot";

/* One recognised puck in one frame: which kind, where, how rotated.
   `held` marks a puck kept alive on fewer feet than it has: four instead
   of five for a ring, two instead of three for a triangle. */
export interface Detection {
    tpl: Template;
    conf: number;
    x: number;
    y: number;
    angle: number;
    /* Indices into the contact array passed to `recognise()`. The old
       tracker only needs the fitted pose; the bridge needs the actual
       feet so the new Base can measure the same object independently.
       On a held triangle these are the **real** feet only, so the new
       pipeline reconstructs the missing one itself rather than being
       handed this one's answer -- two independent reconstructions that
       have to agree. */
    contactIndices: readonly number[];
    /* The same feet, with the contact ids and places the glass reported.
       `track` keeps the last whole set on the puck, and that is what a
       two-foot frame is matched against. */
    feet: readonly TrackFoot[];
    held?: boolean;
    /* This puck as a ruler: a known length, measured. Absent when the
       template's millimetres were themselves measured at the table, and
       absent on a puck held alive with a foot missing -- see
       `readScale`. */
    scale?: ScaleReading;
}
