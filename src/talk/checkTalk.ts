import { sttUrl } from "../config/sttUrl";
import { probeSTT } from "../speech/probeSTT";
import { stt } from "../speech/stt";
import type { NoteView } from "../types/NoteView";
import { setTalkMsg } from "./setTalkMsg";
import { talkReady } from "./talkReady";

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
