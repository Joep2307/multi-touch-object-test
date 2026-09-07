import { noteViewFor } from "../notes/noteViewFor";
import { talk } from "../state/talk";
import type { NoteView } from "../types/NoteView";

/* The window that holds the running recording, if it's still open. There is
   one microphone, so at most one window is recording; the other side sees
   that via its own message (`talkBusy`). */
export const talkView = (): NoteView | null =>
    talk.pin ? noteViewFor(talk.pin) : null;
