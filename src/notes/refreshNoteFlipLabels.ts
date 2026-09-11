import { tr } from "../i18n";
import { notes } from "../state";
import { notePart } from "./notePart";

export function refreshNoteFlipLabels(): void {
    for (const v of notes.views) {
        const fb = notePart(v, "noteFlip");
        if (fb) {
            fb.title = tr("flipSide");
            fb.setAttribute("aria-label", tr("flipSide"));
        }
    }
}
