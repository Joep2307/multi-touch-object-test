import { notePart, noteViewFor } from "../notes";
import { saveSoon } from "../pins";
import { talkTextOf } from "./talkTextOf";
import type { Pin } from "../types";

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
