import { flushSave } from "../pins/flushSave";
import { talk } from "../state/talk";
import { stopTalk } from "../talk/stopTalk";
import type { NoteView } from "../types/NoteView";
import { hideKeyboardIn } from "../ui/keyboard/hideKeyboardIn";

/* Close a single window. `keepTalk` exists for moving to the other side:
   this window then closes while the same marker keeps talking on the
   far side. */
export function closeNote(
    v: NoteView | null | undefined,
    { keepTalk = false }: { keepTalk?: boolean } = {},
): void {
    if (!v || !v.pin) return;
    if (!keepTalk && talk.pin === v.pin) stopTalk(true);
    // What was in the fields is already in the marker (see noteToPin), but
    // the save may still be pending; we flush that here to be sure.
    flushSave();
    v.askAbort?.abort();
    v.askAbort = null;
    const n = v.el;
    n.style.display = "none";
    n.classList.remove("opening");
    n.classList.remove("contact-step");
    v.pin = null;
    hideKeyboardIn(n);
}
