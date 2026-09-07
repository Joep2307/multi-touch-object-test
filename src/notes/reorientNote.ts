import { openNote } from "./openNote";
import { openNotes } from "./openNotes";

/* If the table orientation changes while windows are open, they should move
   along with it instead of closing. First record what's open: reopening
   moves windows around, and then the list would shift out from under you. */
export function reorientNote(): void {
    const open = openNotes().map((v) => ({
        pin: v.pin!,
        x: +(v.el.dataset.anchorX ?? 0) || innerWidth / 2,
        y: +(v.el.dataset.anchorY ?? 0) || innerHeight / 2,
    }));
    for (const o of open) openNote(o.pin, o.x, o.y, true);
}
