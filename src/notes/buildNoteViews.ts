import { cloneWithSuffix } from "../dom/cloneWithSuffix";
import { el } from "../dom/el";
import { notes } from "../state/notes";
import type { NoteView } from "../types/NoteView";
import type { Side } from "../types/Side";
import { wireNote } from "./wireNote";

/* ── Two windows, one per side of the table ──────────────────────────────
   At a table with two sides, two groups work at once. With a single window,
   the second puck would steal the first one's window, mid-sentence. There are
   therefore two: one per side, each with its own keyboard. No more than two --
   beyond that the glass gets crowded and it's no longer clear which window
   belongs to whom; a third puck takes over the window of its own side.

   `#note` and `#keyboard` in index.html are the front side. The far side is a
   clone whose every id gets a "-b" suffix, so ids stay unique. Everything the
   styling needs therefore hangs off classes (`.note`, `.talk-btn`, …), not
   ids; the ids only remain for JS and for the smoke test. */
export function buildNoteViews(): void {
    for (const side of ["a", "b"] as Side[]) {
        const suffix = side === "a" ? "" : "-b";
        const root =
            side === "a" ? el("note") : cloneWithSuffix(el("note"), suffix);
        if (side !== "a") {
            root.style.display = "none";
            document.body.appendChild(root);
        }
        const v: NoteView = {
            side,
            suffix,
            el: root,
            pin: null,
            askAbort: null,
            flip: side === "b",
            talkMsg: { key: "", args: [], warn: false },
        };
        notes.views.push(v);
        wireNote(v);
    }
}
