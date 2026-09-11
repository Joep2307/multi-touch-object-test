import { notePart } from "../notes";
import { talk } from "../state";
import { talkClock } from "./talkClock";
import { talkView } from "./talkView";

export function showTalkClock(): void {
    const v = talkView();
    if (v)
        notePart(v, "talkTime").textContent = talk.session ? talkClock() : "";
}
