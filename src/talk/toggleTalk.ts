import { sttUrl } from "../config/sttUrl";
import { notePart } from "../notes/notePart";
import { noteViewFor } from "../notes/noteViewFor";
import { probeSTT } from "../speech/probeSTT";
import { startTalk } from "../speech/startTalk";
import { stt } from "../speech/stt";
import { talk } from "../state/talk";
import { ui } from "../state/ui";
import type { NoteView } from "../types/NoteView";
import { appendTalk } from "./appendTalk";
import { renderTalk } from "./renderTalk";
import { setTalkMsg } from "./setTalkMsg";
import { startTalkClock } from "./startTalkClock";
import { stopTalk } from "./stopTalk";
import { talkError } from "./talkError";
import { talkReady } from "./talkReady";
import { talkRunning } from "./talkRunning";

export async function toggleTalk(v: NoteView): Promise<void> {
    if (talkRunning(v.pin)) {
        stopTalk();
        return;
    }
    const pin = v.pin;
    if (!pin || talk.busy) return;
    /* One microphone for the whole table. If the other side is recording,
     that's not an error but something to say -- otherwise someone presses a
     button ten times that seems to do nothing. */
    if (talk.session) {
        setTalkMsg(v, "talkBusy", { warn: true });
        return;
    }
    talk.busy = true;
    try {
        setTalkMsg(v, "talkStarting");
        await probeSTT(sttUrl());
        if (v.pin !== pin) return;
        if (stt.mode === "geen") {
            talkReady(v);
            return;
        }
        const session = await startTalk({
            lang: ui.lang,
            onSegment: (text) => appendTalk(pin, text),
            onPartial: (text) => {
                const w = noteViewFor(pin);
                if (talk.pin === pin && w)
                    notePart(w, "talkPartial").textContent = text;
            },
            onError: (key) => talkError(key),
            onAudio: (blob) => {
                talk.audioBlob = blob;
                const w = noteViewFor(pin);
                if (w) {
                    notePart(w, "talkAudio").style.display = "";
                    setTalkMsg(w, "talkAudioReady");
                }
            },
        });
        if (!session) return; // speech has already reported the reason
        if (v.pin !== pin) {
            session.stop();
            return;
        }
        talk.session = session;
        talk.pin = pin;
        talk.audioBlob = null;
        notePart(v, "talkAudio").style.display = "none";
        talk.startedAt = performance.now();
        startTalkClock();
        renderTalk(v);
        setTalkMsg(
            v,
            session.mode === "browser"
                ? "talkListening"
                : session.mode === "backend"
                  ? "talkWriting"
                  : "talkRecording",
        );
    } finally {
        talk.busy = false;
    }
}
