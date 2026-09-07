import { tr } from "../i18n/tr";
import { notePart } from "../notes/notePart";
import { talk } from "../state/talk";
import type { NoteView } from "../types/NoteView";
import { talkRunning } from "./talkRunning";
import { talkTextOf } from "./talkTextOf";

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
