import type { Shape } from "./Shape";

/* The two triangles of a duo: the big and the small one, how cleanly
   they nest (`score`, lower is better), and which of the six input
   points went to which (`bi`, `si`); see `splitDuo`. */
export interface DuoSplit {
    big: Shape;
    small: Shape;
    score: number;
    bi: number[];
    si: number[];
}
