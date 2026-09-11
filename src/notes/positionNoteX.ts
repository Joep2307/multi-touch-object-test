import { ui } from "../state";
import type { NoteView } from "../types";

/* Which side of the marker the window opens on depends on where there's
   still room. That room changes as soon as the UI scale grows or shrinks,
   so this is separate from openNote and can be recomputed independently. */
export function positionNoteX(v: NoteView | null | undefined): void {
    const n = v?.el;
    if (!n || n.style.display !== "block") return;
    const s = ui.scale;
    const x = +(n.dataset.anchorX ?? 0) || innerWidth / 2;
    const reach = +(n.dataset.puckReach ?? 0) || 34;
    const width = n.offsetWidth * s; // screen pixels
    const opensRight = x + width + reach < innerWidth - 12;
    const left = opensRight ? x + reach : x - reach - width;
    n.style.left =
        Math.max(12, Math.min(innerWidth - width - 12, left)) / s + "px";
    n.style.setProperty("--origin-x", opensRight ? "0" : "100%");
    n.style.setProperty("--enter-x", opensRight ? "-28px" : "28px");
}
