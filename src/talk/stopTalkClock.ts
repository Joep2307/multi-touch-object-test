import { notePart } from "../notes";
import { notes, talk } from "../state";

export function stopTalkClock(): void {
    if (talk.tick) clearInterval(talk.tick);
    talk.tick = null;
    for (const v of notes.views) notePart(v, "talkTime").textContent = "";
}
