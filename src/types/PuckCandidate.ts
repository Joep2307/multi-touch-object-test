import type { PuckShape } from "./PuckShape";
import type { Template } from "./Template";

/* One possible puck in one frame, before the candidates compete for the
   same contact points. `errN` is the error divided by its own tolerance,
   so a triangle (a ratio) and a ring (degrees) compete fairly. */
export interface PuckCandidate {
    tpl: Template;
    errN: number;
    idx: number[];
    d: PuckShape;
    conf: number;
    score?: number;
}
