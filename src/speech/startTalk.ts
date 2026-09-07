import type { TalkCallbacks } from "../types/TalkCallbacks";
import type { TalkSay } from "../types/TalkSay";
import type { TalkSession } from "../types/TalkSession";
import { browserSession } from "./browserSession";
import { recorderSession } from "./recorderSession";
import { stt } from "./stt";

/* ── Recording ─────────────────────────────────────────────────────────────
   `startTalk` provides a session with one button: stop(). Whatever happens
   along the way goes through the notifications in TalkCallbacks.

   Deliberately segments and not full text: the pin remains the source of
   truth, so that someone who corrects themselves halfway through a sentence
   doesn't lose that in the next chunk. */
export async function startTalk({
    lang = "en",
    onSegment,
    onPartial,
    onError,
    onAudio,
}: TalkCallbacks = {}): Promise<TalkSession | null> {
    const say: TalkSay = {
        segment: onSegment || (() => {}),
        partial: onPartial || (() => {}),
        error: onError || (() => {}),
        audio: onAudio || (() => {}),
    };
    if (stt.mode === "browser") return browserSession(lang, say);
    if (stt.mode === "backend" || stt.mode === "audio")
        return recorderSession(lang, say, stt.mode === "backend");
    say.error(stt.reason || "nomic");
    return null;
}
