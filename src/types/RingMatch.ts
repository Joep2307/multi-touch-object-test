/* How well a measured ring fits one template: the mean gap error in
   degrees, the resulting puck angle in radians, and how many feet the
   measurement had. */
export interface RingMatch {
    err: number;
    angle: number;
    legs: number;
}
