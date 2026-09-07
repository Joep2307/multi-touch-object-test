import { ui } from "../state/ui";
import type { NoteView } from "../types/NoteView";
import { openNotes } from "./openNotes";

/* The height of the window is not fixed ahead of time: first the list of
   nearby documents comes in, then the answer grows token by token. So we
   measure and only then position.

   `recentre` distinguishes the two cases. On opening, the window is centred
   on the marker; if it grows afterward, it stays where it is and only
   shifts up once it would otherwise run off the screen. Without that
   distinction it would jump with every incoming word. */
export function positionNote(
    v: NoteView | null | undefined,
    recentre = true,
): void {
    const n = v?.el;
    if (!v || !n || n.style.display !== "block") return;
    const s = ui.scale;
    const y = +(n.dataset.anchorY ?? 0) || innerHeight / 2; // screen pixels
    const h = n.offsetHeight * s; // same: offsetHeight is measured unscaled
    let lo = 12,
        hi = Math.max(12, innerHeight - h - 12);
    /* If two windows are open, each keeps to its own half of the table:
     otherwise the window on the far side would slide over yours. If the
     window doesn't fit within that half, readability wins and it may
     cross the centre line. */
    if (openNotes().length > 1 && h <= innerHeight / 2 - 18) {
        if (v.flip) hi = Math.min(hi, innerHeight / 2 - h - 6);
        else lo = Math.max(lo, innerHeight / 2 + 6);
    }
    const prev = parseFloat(n.style.top);
    const wanted = recentre
        ? y - h / 2
        : Number.isFinite(prev)
          ? prev * s
          : y - h / 2;
    const top = Math.max(lo, Math.min(hi, wanted));
    n.style.top = top / s + "px";
}
