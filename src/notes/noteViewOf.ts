import { notes } from "../state/notes";
import type { NoteView } from "../types/NoteView";

/* The window this element is in, if it is in a window. */
export const noteViewOf = (node: Node | null): NoteView | null =>
    (node && notes.views.find((v) => v.el.contains(node))) || null;
