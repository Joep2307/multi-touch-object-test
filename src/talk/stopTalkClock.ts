import { notePart } from "../notes/notePart";
import { notes } from "../state/notes";
import { talk } from "../state/talk";

export function stopTalkClock(): void {
    if (talk.tick) clearInterval(talk.tick);
    talk.tick = null;
    for (const v of notes.views) notePart(v, "talkTime").textContent = "";
}
