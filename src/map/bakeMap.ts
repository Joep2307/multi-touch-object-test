import { el } from "../dom/el";
import { tr } from "../i18n/tr";
import { tiles } from "../state/tiles";
import { view } from "../state/view";
import type { BasemapRecord } from "../types/BasemapRecord";
import { MV } from "./MV";
import { bakeStore } from "./bakeStore";

/* Capture the current map view as a JPEG and save it. */
export function bakeMap(): void {
    const cv = view.cv;
    const nw = MV.unproject(0, 0),
        se = MV.unproject(view.W, view.H);
    const scale = Math.min(1, 3072 / cv.width);
    const off = document.createElement("canvas");
    off.width = Math.round(cv.width * scale);
    off.height = Math.round(cv.height * scale);
    off.getContext("2d")!.drawImage(cv, 0, 0, off.width, off.height);
    let data: string;
    try {
        data = off.toDataURL("image/jpeg", 0.9);
    } catch (err) {
        el("bakeHint").innerHTML = tiles.tainted.has(MV.set)
            ? tr("bakeTainted")
            : tr("bakeFailed");
        return;
    }
    const rec: BasemapRecord = {
        data,
        west: nw.lng,
        north: nw.lat,
        east: se.lng,
        south: se.lat,
    };
    const img = new Image();
    img.onload = () => {
        tiles.bgImage = {
            img,
            west: rec.west,
            north: rec.north,
            east: rec.east,
            south: rec.south,
        };
    };
    img.src = data;
    bakeStore
        .put(rec)
        .then(() => {
            el("bakeHint").innerHTML = tr(
                "bakeSaved",
                Math.round(data.length / 1024),
            );
        })
        .catch(() => {
            el("bakeHint").innerHTML = tr("bakeTooBig");
        });
}
