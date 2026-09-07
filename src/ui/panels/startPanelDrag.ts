import { panels } from "../../state/panels";
import { PANEL_SNAP_DISTANCE } from "./PANEL_SNAP_DISTANCE";
import { applyPanelOffset } from "./applyPanelOffset";
import { clampPanel } from "./clampPanel";
import { resetPanelOffset } from "./resetPanelOffset";

export function startPanelDrag(
    panel: HTMLElement,
    zone: HTMLElement,
    e: PointerEvent,
): void {
    if (e.button > 0) return;
    const o = panels.offsets.get(panel) || { x: 0, y: 0 };
    panels.offsets.set(panel, o);
    const sx = e.clientX,
        sy = e.clientY,
        ox = o.x,
        oy = o.y;
    let moved = false;
    try {
        zone.setPointerCapture(e.pointerId);
    } catch (err) {}
    panel.classList.add("dragging");
    const move = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        o.x = ox + ev.clientX - sx;
        o.y = oy + ev.clientY - sy;
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 4)
            moved = true;
        clampPanel(panel);
        applyPanelOffset(panel);
        panel.classList.toggle(
            "snap-home",
            Math.hypot(o.x, o.y) <= PANEL_SNAP_DISTANCE,
        );
    };
    const stop = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        zone.removeEventListener("pointermove", move);
        zone.removeEventListener("pointerup", stop);
        zone.removeEventListener("pointercancel", stop);
        panel.classList.remove("dragging");
        if (moved) {
            panels.dragEnd = performance.now();
            if (Math.hypot(o.x, o.y) <= PANEL_SNAP_DISTANCE) {
                /* First capture one frame at the release position. Then the
           transition can visibly run from that position to the origin. */
                panel.getBoundingClientRect();
                resetPanelOffset(panel);
            } else panel.classList.remove("snap-home");
        }
    };
    zone.addEventListener("pointermove", move);
    zone.addEventListener("pointerup", stop);
    zone.addEventListener("pointercancel", stop);
    e.preventDefault();
    e.stopPropagation();
}
