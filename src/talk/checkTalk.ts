import { sttUrl } from "../config";
import { probeSTT, stt } from "../speech";
import { setTalkMsg } from "./setTalkMsg";
import { talkReady } from "./talkReady";
import type { NoteView } from "../types";

/* What can this table do? Probe once, and show the answer right away:
   "transcription isn't available here" should become clear before someone
   spends ten minutes talking into a microphone, not after. */
export function checkTalk(v: NoteView): void {
    if (stt.checked) {
        talkReady(v);
        return;
    }
    setTalkMsg(v, "talkCheck");
    probeSTT(sttUrl()).then(() => {
        if (v.pin) talkReady(v);
    });
}
