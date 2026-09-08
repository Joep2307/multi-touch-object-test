import type { Verdict } from "./Verdict";

/* What a puck is to the table. Two shapes in one type: a ring of five feet
   (`angles` + `ringMM`) or a triangle of tape (`ratios` + `longestMM`).
   Which of the two it is changes the moment you learn it again, so both are
   optional -- exactly the way `applyShape` and `resetTemplates` treat them.
   `learnedAt` is only there once it has been read in; without that date it
   is the build drawing. */
export interface Template {
    id: string;
    verdict: Verdict;
    /* Ring: the angles of the five feet, and the radius of their circle. */
    angles?: number[];
    ringMM?: number;
    /* Grid code: the ring divided into `slots` compartments, and `code`
     as the bit mask of which of them carry a foot -- bit 0 is the slot the
     arrow points into. The radius is `ringMM`, the same field as the ring
     above: two pucks with the same code but a different ring are two
     different pucks. */
    slots?: number;
    code?: number;
    /* Triangle: the two short sides divided by the longest, and that
     longest side in mm. */
    ratios?: [number, number];
    longestMM?: number;
    learnedAt?: string | null;
    /* Learned in puck mode, in place of one of the four from the blueprint. */
    own?: boolean;
    /* The duo. `role` says what this puck's ring shows, `nest` that it lies
     on the same spot as its other half on purpose, `nameKey` and `color`
     give it its own name and colour -- a tool should not be called a
     verdict -- and `radiusMM` is its disc, because the small puck of the
     pair is not as wide as the four from the drawing. */
    role?: "tool";
    nest?: boolean;
    nameKey?: string;
    color?: string;
    radiusMM?: number;
    /* Memory only: the duo has been seen as a pair this session, so the
     measurements above are measured and no longer the build drawing. */
    duoSeen?: boolean;
}
