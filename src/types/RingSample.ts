/* One frame of a ring being learned; the angles are already turned to run
   from the arrow. */
export interface RingSample {
    ring: true;
    duo?: false;
    slot?: false;
    angles: number[];
    size: number;
    cx: number;
    cy: number;
}
