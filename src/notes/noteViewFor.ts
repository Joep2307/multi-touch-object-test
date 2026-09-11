import { notes } from "../state";
import type { NoteView, Pin } from "../types";

export const noteViewFor = (pin: Pin | null | undefined): NoteView | null =>
    (pin && notes.views.find((v) => v.pin === pin)) || null;
