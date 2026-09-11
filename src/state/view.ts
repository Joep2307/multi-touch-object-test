import { el } from "../dom";

/* The screen and the two canvases: the top one draws every frame, the map
   layer underneath only when something about the map has changed. `W` and
   `H` are screen pixels; `pxPerMM` follows from the screen diagonal and
   determines recognition.

   The canvases are looked up the first time anything asks for them, not
   when this module loads. A unit test may import a module that imports
   `view` without there being a page at all, and nothing in the tree may
   do work at import time that needs one. `el` still fails hard when the
   page has no canvas — that stays a mistake in index.html, found by the
   first frame instead of by the first import. */
let cv: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let mapLayer: HTMLCanvasElement | null = null;
let mapCtx: CanvasRenderingContext2D | null = null;

const canvas = (): HTMLCanvasElement => (cv ??= el<HTMLCanvasElement>("c"));
const context = (): CanvasRenderingContext2D =>
    (ctx ??= canvas().getContext("2d") as CanvasRenderingContext2D);
const layer = (): HTMLCanvasElement =>
    (mapLayer ??= document.createElement("canvas"));
const layerContext = (): CanvasRenderingContext2D =>
    (mapCtx ??= layer().getContext("2d") as CanvasRenderingContext2D);

export const view = {
    W: 0,
    H: 0,
    pxPerMM: 4,
    get cv(): HTMLCanvasElement {
        return canvas();
    },
    get ctx(): CanvasRenderingContext2D {
        return context();
    },
    get mapLayer(): HTMLCanvasElement {
        return layer();
    },
    get mapCtx(): CanvasRenderingContext2D {
        return layerContext();
    },
    /* What the map layer was last drawn for; empty forces a new one. */
    mapRenderKey: "",
    lastUI: 0,
};
