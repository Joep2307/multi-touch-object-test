import { el } from "../dom/el";
import { MV } from "../map/MV";
import { tiles } from "../state/tiles";
import { view } from "../state/view";

/* Drop a map picture (PNG/JPG) to use it as the background. It is pinned to the
   coordinates currently on screen, so panning and zooming still work afterwards. */
export function onImageDrop(e: DragEvent): void {
    e.preventDefault();
    const f = e.dataTransfer?.files && e.dataTransfer.files[0];
    if (!f || !/^image\//.test(f.type)) return;
    const img = new Image();
    img.onload = () => {
        const nw = MV.unproject(0, 0),
            se = MV.unproject(view.W, view.H);
        tiles.bgImage = {
            img,
            west: nw.lng,
            north: nw.lat,
            east: se.lng,
            south: se.lat,
        };
        MV.set = "none";
        el<HTMLSelectElement>("tiles").value = "none";
    };
    img.src = URL.createObjectURL(f);
}
