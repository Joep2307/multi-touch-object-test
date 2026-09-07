import { panels } from "../../state/panels";

/* A panel may be pushed off the map, but never so far that there's nothing
   left of it to grab to bring it back. */
export function clampPanel(panel: HTMLElement): void {
    const o = panels.offsets.get(panel);
    if (!o) return;
    const prev = panel.style.translate;
    panel.style.translate = "";
    const r = panel.getBoundingClientRect(); // position without displacement
    panel.style.translate = prev;
    if (!r.width || !r.height) return;
    const keepX = Math.min(64, r.width * 0.6),
        keepY = Math.min(64, r.height * 0.9);
    o.x = Math.max(
        keepX - r.left - r.width,
        Math.min(innerWidth - keepX - r.left, o.x),
    );
    o.y = Math.max(
        keepY - r.top - r.height,
        Math.min(innerHeight - keepY - r.top, o.y),
    );
}
