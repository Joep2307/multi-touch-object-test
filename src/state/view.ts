import { el } from "../dom/el";

/* The screen and the two canvases: the top one draws every frame, the map
   layer underneath only when something about the map has changed. `W` and
   `H` are screen pixels; `pxPerMM` follows from the screen diagonal and
   determines recognition. */
const cv = el<HTMLCanvasElement>("c");
const mapLayer = document.createElement("canvas");

export const view = {
    W: 0,
    H: 0,
    pxPerMM: 4,
    cv,
    ctx: cv.getContext("2d") as CanvasRenderingContext2D,
    mapLayer,
    mapCtx: mapLayer.getContext("2d") as CanvasRenderingContext2D,
    /* What the map layer was last drawn for; empty forces a new one. */
    mapRenderKey: "",
    lastUI: 0,
};
