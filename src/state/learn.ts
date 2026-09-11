import type { LearnMeasure, LearnPhase, LearnSample } from "../types";

/* The "Recognize puck" measurement window. It doesn't take a single frame
   but a series: a finger or a sticker jitters by a few pixels, and the
   median of ~50 measurements is far more stable than a single snapshot. If
   the puck moves during measurement, the series starts over — otherwise
   you'd be measuring the movement too. */
export const learn = {
    open: false,
    phase: "wait" as LearnPhase,
    samples: [] as LearnSample[],
    t0: 0,
    m: null as LearnMeasure | null,
    tplId: null as string | null,
    clash: null as string | null,
    note: "",
    moved: false,
    /* The duo is saved in one go: two triangles from the same measurement,
     with the same date. */
    duoSaved: false,
    /* How many already-learned pucks lie on the glass right now -- only so
     the window can say so. */
    known: 0,
};
