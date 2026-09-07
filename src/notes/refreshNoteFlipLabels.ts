import { tr } from "../i18n/tr";
import { notes } from "../state/notes";
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
