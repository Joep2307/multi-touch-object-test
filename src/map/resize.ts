import { CFG } from "../config";
import { syncPxPerMM } from "../puck/scale";
import { scale, view } from "../state";

/* Measure the screen: size the canvases to screen size times pixel density,
   and compute the millimeter scale that recognition needs. */
export function resize(): void {
    const dpr = Math.min(devicePixelRatio || 1, 3);
    view.W = innerWidth;
    view.H = innerHeight;
    view.cv.width = view.W * dpr;
    view.cv.height = view.H * dpr;
    view.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.mapLayer.width = view.W * dpr;
    view.mapLayer.height = view.H * dpr;
    view.mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.mapRenderKey = "";
    view.ctx.imageSmoothingQuality = "high";
    view.mapCtx.imageSmoothingQuality = "high";
    /* The declared screen size is the seed, not the answer: the pucks
       correct it from here. A window on half the screen halves the seed and
       leaves that correction standing -- see `scale`. */
    scale.seed = Math.hypot(view.W, view.H) / (CFG.screenDiagIn * 25.4);
    syncPxPerMM();
}
