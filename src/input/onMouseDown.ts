import { closeNotes } from "../notes";
import { pinAt } from "../pins";
import { simPuckAt } from "../puck/sim";
import { touches, tracks, ui } from "../state";

export function onMouseDown(e: MouseEvent): void {
    const t = e.target as Element | null;
    if (t?.closest(".panel") || t?.closest("#sheet") || t?.closest("#learn"))
        return;
    if (ui.pinMoveMode) {
        e.preventDefault();
        const pin = pinAt(e.clientX, e.clientY);
        if (pin) {
            touches.pinDrag = { pin, kind: "mouse" };
            document.body.classList.add("dragging-dot");
            closeNotes();
        }
        return;
    }
    const hit = simPuckAt(e.clientX, e.clientY);
    e.preventDefault();
    if (!hit) {
        if (!ui.mapLocked && tracks.map.size === 0)
            touches.mousePan = { x: e.clientX, y: e.clientY };
        return;
    }
    touches.drag = {
        puck: hit,
        rotate: e.button === 2 || e.shiftKey,
        ox: e.clientX - hit.x,
        oy: e.clientY - hit.y,
        r0: hit.rot,
        a0: Math.atan2(e.clientY - hit.y, e.clientX - hit.x),
        t0: performance.now(),
        px: hit.x,
        py: hit.y,
        rot0: hit.rot,
    };
    touches.gesture = null;
    touches.mousePan = null;
}
