import type { NoteView } from "../types";

/* A part of THIS window. Without a suffix it's the front side, so
   `notePart(frontSide,"noteTitle")` is simply `#noteTitle`. */
export const notePart = <T extends HTMLElement = HTMLElement>(
    v: NoteView,
    id: string,
): T => document.getElementById(id + v.suffix) as T;
