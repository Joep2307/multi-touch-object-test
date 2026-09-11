import { sim, templates, ui } from "../../state";
import { moveGhost } from "./moveGhost";

export function onTrayDown(e: PointerEvent): void {
    const node = (e.target as HTMLElement).closest<HTMLElement>(".traypuck");
    if (!node) return;
    const tpl = templates.list.find((t) => t.id === node.dataset.id);
    if (!tpl) return;
    e.preventDefault();
    const ghost = node.cloneNode(true) as HTMLElement;
    ghost.style.cssText =
        "position:fixed;z-index:60;margin:0;pointer-events:none;" +
        "opacity:.9;zoom:" +
        ui.scale;
    document.body.appendChild(ghost);
    sim.trayDrags.set(e.pointerId, {
        tpl,
        ghost,
        node,
        x0: e.clientX,
        y0: e.clientY,
    });
    moveGhost(e);
}
