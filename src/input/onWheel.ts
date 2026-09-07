import { MV } from "../map/MV";
import { simPuckAt } from "../puck/sim/simPuckAt";
import { ui } from "../state/ui";
import { view } from "../state/view";
import { uiChrome } from "./uiChrome";

export function onWheel(e: WheelEvent): void {
    if (ui.pinMoveMode) {
        e.preventDefault();
        return;
    }
    const hit = simPuckAt(e.clientX, e.clientY);
    if (hit) {
        e.preventDefault();
        hit.rot += e.deltaY * 0.002;
        return;
    }
    // Whatever is UI chrome scrolls; only the map itself zooms.
    if (uiChrome(e.target)) return;
    if (!ui.mapLocked) {
        e.preventDefault();
        // normalise the wheel across mice (pixels), trackpads (many small pixels) and Firefox (lines/pages)
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? view.H : 1;
        const dz = Math.max(-0.6, Math.min(0.6, (-e.deltaY * unit) / 220));
        MV.zoomBy(dz, e.clientX, e.clientY);
    }
}
