import { notes } from "../state";
import type { NoteView } from "../types";

/* The windows that are currently open (have a marker). */
export const openNotes = (): NoteView[] => notes.views.filter((v) => v.pin);
