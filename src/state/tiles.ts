import type { BgImage, TileImage } from "../types";

/* The tile cache and the state of the map background. */
export const tiles = {
    cache: new Map<string, TileImage>(),
    tried: 0,
    failed: 0,
    /* Increments as soon as a tile comes in; the map layer then redraws. */
    revision: 0,
    refreshTimer: null as ReturnType<typeof setTimeout> | null,
    /* Sources without a CORS header can't be loaded with crossOrigin and end
     up staying black. We retry once without it; the tiles do appear then,
     but the canvas becomes "tainted" and saving offline no longer works for
     that image. */
    tainted: new Set<string>(),
    /* A map image pinned to real-world coordinates. */
    bgImage: null as BgImage | null,
    /* "Save map offline" has been pressed; the next frame does it. */
    bakePending: false,
};
