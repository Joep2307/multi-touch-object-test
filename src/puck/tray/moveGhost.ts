import { sim, ui } from "../../state";

export function moveGhost(e: PointerEvent): void {
    const d = sim.trayDrags.get(e.pointerId);
    if (!d) return;
    d.ghost.style.left = e.clientX / ui.scale - 27 + "px";
    d.ghost.style.top = e.clientY / ui.scale - 27 + "px";
}
