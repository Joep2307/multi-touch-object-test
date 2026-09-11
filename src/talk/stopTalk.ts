import { tr } from "../i18n";
import { notePart } from "../notes";
import { save } from "../pins";
import { talk } from "../state";
import { renderTalk } from "./renderTalk";
import { setTalkMsg } from "./setTalkMsg";
import { stopTalkClock } from "./stopTalkClock";
import { talkTextOf } from "./talkTextOf";
import { talkView } from "./talkView";

export function stopTalk(quiet = false): void {
    const session = talk.session,
        pin = talk.pin,
        v = talkView();
    talk.session = null;
    talk.pin = null;
    stopTalkClock();
    if (v) {
        notePart(v, "talkPartial").textContent = "";
        notePart(v, "talkBtn").classList.remove("rec");
        notePart(v, "talkBtn").textContent = tr("talkStart");
    }
    const mode = session?.mode;
    /* Transcription mode may still have a chunk in flight; those last words
     should still be included before we report how many there are. */
    Promise.resolve(session?.stop()).then(() => {
        save();
        if (quiet || !v || v.pin !== pin) return;
        if (mode === "audio") return; // onAudio sets its own message
        const words = talkTextOf(pin).split(/\s+/).filter(Boolean).length;
        setTalkMsg(v, words ? "talkDone" : "talkNoText", { args: [words] });
        renderTalk(v);
    });
}
