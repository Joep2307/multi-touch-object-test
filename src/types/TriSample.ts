/* One frame of a triangle being learned. */
export interface TriSample {
    ring: false;
    duo?: false;
    r0: number;
    r1: number;
    size: number;
    cx: number;
    cy: number;
}
