/* A circle through a cloud of points: centre, mean radius, and how much the
   points scatter around it (relative to the radius). */
export interface CircleFit {
    cx: number;
    cy: number;
    r: number;
    spread: number;
}
