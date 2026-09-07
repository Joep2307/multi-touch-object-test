/* The smoothed knowledge field: one pixel per grid cell, in geographic
   space. The grid's y-axis runs northward, the image's runs southward —
   which is why the corners are remembered. */
export interface Heat {
    cv: HTMLCanvasElement;
    gx0: number;
    gy0: number;
    gx1: number;
    gy1: number;
    cols: number;
    rows: number;
}
