import { notes } from "../state/notes";
import type { NoteView } from "../types/NoteView";
import type { Pin } from "../types/Pin";

export const noteViewFor = (pin: Pin | null | undefined): NoteView | null =>
    (pin && notes.views.find((v) => v.pin === pin)) || null;
