import { notePart } from "../notes/notePart";
import { talk } from "../state/talk";
import { talkClock } from "./talkClock";
import { talkView } from "./talkView";

export function showTalkClock(): void {
    const v = talkView();
    if (v)
        notePart(v, "talkTime").textContent = talk.session ? talkClock() : "";
}
