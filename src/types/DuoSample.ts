/* One frame of the duo being learned: the two triangles of the pair in one
   sample, so they can never end up with different dates or sizes. */
export interface DuoSample {
    duo: true;
    ring?: false;
    size: number;
    cx: number;
    cy: number;
    o0: number;
    o1: number;
    osize: number;
    i0: number;
    i1: number;
    isize: number;
}
