import { notes } from "../state/notes";
import type { NoteView } from "../types/NoteView";
import type { Side } from "../types/Side";

export const noteViewOnSide = (side: Side): NoteView =>
    notes.views.find((v) => v.side === side) || notes.views[0];
