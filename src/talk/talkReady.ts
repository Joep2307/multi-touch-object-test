import { stt } from "../speech/stt";
import { talk } from "../state/talk";
import type { NoteView } from "../types/NoteView";
import { setTalkMsg } from "./setTalkMsg";

export function talkReady(v: NoteView): void {
    if (talk.session) {
        // One microphone: a recording is already running on the other side.
        if (talk.pin !== v.pin) setTalkMsg(v, "talkBusy", { warn: true });
        return;
    }
    if (stt.mode === "geen")
        setTalkMsg(
            v,
            stt.reason === "insecure" ? "talkInsecure" : "talkNoMic",
            { warn: true },
        );
    else if (stt.mode === "audio")
        setTalkMsg(v, "talkOnlyAudio", { warn: true });
    else setTalkMsg(v, "");
}
