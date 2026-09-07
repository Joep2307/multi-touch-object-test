import { notePart } from "../notes/notePart";
import { noteViewFor } from "../notes/noteViewFor";
import { saveSoon } from "../pins/saveSoon";
import type { Pin } from "../types/Pin";
import { talkTextOf } from "./talkTextOf";

/* Append a finished chunk of speech after the text. */
export function appendTalk(pin: Pin, text: string): void {
    const t = String(text || "").trim();
    if (!t) return;
    const had = talkTextOf(pin).replace(/\s+$/, "");
    pin.transcript = had ? had + " " + t : t;
    const v = noteViewFor(pin);
    if (v) {
        const box = notePart<HTMLTextAreaElement>(v, "talkText");
        box.value = pin.transcript;
        box.scrollTop = box.scrollHeight;
        notePart(v, "talkClear").style.display = "";
    }
    saveSoon();
}
