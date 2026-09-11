import { tr } from "../i18n";
import { notePart } from "../notes";
import { talk } from "../state";
import { talkRunning } from "./talkRunning";
import { talkTextOf } from "./talkTextOf";
import type { NoteView } from "../types";

export function renderTalk(v: NoteView): void {
    const pin = v.pin,
        box = notePart<HTMLTextAreaElement>(v, "talkText");
    box.value = talkTextOf(pin);
    notePart(v, "talkPartial").textContent = "";
    notePart(v, "talkClear").style.display = box.value ? "" : "none";
    notePart(v, "talkAudio").style.display =
        talk.audioBlob && talk.pin === pin ? "" : "none";
    const rec = talkRunning(pin);
    notePart(v, "talkBtn").classList.toggle("rec", rec);
    notePart(v, "talkBtn").textContent = tr(rec ? "talkStop" : "talkStart");
    if (!rec) notePart(v, "talkTime").textContent = "";
}
