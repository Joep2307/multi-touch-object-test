import { notePart } from "../notes";
import type { NoteView } from "../types";

/* Every keystroke goes straight to the marker. This is a table where
   multiple people work at the same time: there's one note window per side,
   and waiting until someone pressed "Save" meant the first person's
   half-typed contribution was gone the moment the second person tapped a
   marker. "Save" now just closes the window; it no longer saves anything
   that wasn't already saved. */
export function noteToPin(v: NoteView | null | undefined): void {
    const pin = v?.pin;
    if (!pin || !v) return;
    pin.title = notePart<HTMLInputElement>(v, "noteTitle").value.trim();
    pin.description = notePart<HTMLTextAreaElement>(
        v,
        "noteText",
    ).value.trim();
    // Keep older exports and saved sessions compatible.
    pin.note = pin.description;
}
