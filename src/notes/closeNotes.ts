import { notes } from "../state/notes";
import { closeNote } from "./closeNote";

/* Close everything: when switching orientation, dragging markers, or
   tapping the knowledge graph, no window should be left standing. */
export function closeNotes(): void {
    for (const v of notes.views) closeNote(v);
}
