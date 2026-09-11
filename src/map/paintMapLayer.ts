import { tiles, ui, view } from "../state";
import { MV } from "./MV";
import { drawMap } from "./drawMap";

/* The map is drawn onto its own layer, and only redrawn when something about
   the map has actually changed; every frame just copies that layer to the
   screen. */
export function paintMapLayer(): void {
    const bg = tiles.bgImage;
    const bgKey = bg
        ? [bg.west, bg.east, bg.north, bg.south].join(",")
        : "none";
    const key = [
        view.W,
        view.H,
        MV.set,
        MV.lng.toFixed(7),
        MV.lat.toFixed(7),
        MV.zoom.toFixed(5),
        MV.north,
        tiles.revision,
        bgKey,
        ui.calmMap,
    ].join("|");
    if (key !== view.mapRenderKey) {
        drawMap(view.mapCtx);
        view.mapRenderKey = key;
    }
    view.ctx.drawImage(
        view.mapLayer,
        0,
        0,
        view.mapLayer.width,
        view.mapLayer.height,
        0,
        0,
        view.W,
        view.H,
    );
}
