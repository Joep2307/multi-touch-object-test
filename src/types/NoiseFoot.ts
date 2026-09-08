/* One foot during a noise measurement. `ax`/`ay` is where it lay when the
   series started -- contact points are matched against that, so a puck
   that slowly slides doesn't quietly drag the average along with it. The
   sums are what the spread is computed from afterwards; `miss` counts the
   frames in which this foot was not reported at all. */
export interface NoiseFoot {
    ax: number;
    ay: number;
    n: number;
    sx: number;
    sy: number;
    sxx: number;
    syy: number;
    miss: number;
}
