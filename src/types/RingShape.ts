/* What the table makes of five points: centre, radius, the five angles
   clockwise and the gaps between them. `spread` says how cleanly they lie
   on one circle -- five loose fingers never manage that. */
export interface RingShape {
    ring: true;
    cx: number;
    cy: number;
    radius: number;
    spread: number;
    angles: number[];
    gaps: number[];
    /* Filled in once a template has been matched to it. */
    angle?: number;
}
