import { tr } from "../i18n/tr";
import { notePart } from "../notes/notePart";
import type { NoteView } from "../types/NoteView";

/* The message under the text field is set by JS, so we remember which one
   it is: on a language switch, the same sentence should appear in the other
   language instead of staying stuck. */
export function setTalkMsg(
    v: NoteView | null | undefined,
    key: string,
    {
        warn = false,
        args = [] as unknown[],
    }: { warn?: boolean; args?: unknown[] } = {},
): void {
    if (!v) return;
    v.talkMsg = { key, args, warn };
    const p = notePart(v, "talkStatus");
    p.textContent = key ? tr(key, ...args) : "";
    p.classList.toggle("warn", !!key && warn);
}
