import { notes } from "../state/notes";
import type { NoteView } from "../types/NoteView";

/* The windows that are currently open (have a marker). */
export const openNotes = (): NoteView[] => notes.views.filter((v) => v.pin);
