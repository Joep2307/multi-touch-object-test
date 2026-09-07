/* Grid cell for knowledge density. 0.002° latitude is ~222 m; at 51.6° a
   degree of longitude is only 62% of a degree of latitude, so the
   longitude step needs to be larger to get square cells. These cells are
   only the measurement grain — what you see is a smoothed-out field, not
   individual boxes. */
export const CELL = {
    LAT: 0.002,
    LON: 0.002 / Math.cos((51.6 * Math.PI) / 180),
};
