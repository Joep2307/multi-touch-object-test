import { talk } from "../state/talk";
import { showTalkClock } from "./showTalkClock";
import { stopTalkClock } from "./stopTalkClock";

export function startTalkClock(): void {
    stopTalkClock();
    showTalkClock();
    talk.tick = setInterval(showTalkClock, 1000);
}
