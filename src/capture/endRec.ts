import { capture } from "../state/capture";
import { stopTracks } from "./stopTracks";

/* The recorder has stopped, for whatever reason: hand over what it
   produced. No chunks at all after a plain stop counts as "leeg". */
export function endRec(): void {
    const r = capture.rec;
    capture.rec = null;
    clearInterval(capture.recTimer);
    capture.recTimer = 0;
    stopTracks(r);
    const chunks = capture.recChunks;
    capture.recChunks = [];
    capture.events.change?.();
    const blob = chunks.length
        ? new Blob(chunks, { type: capture.recMime })
        : null;
    const reason = capture.recReason;
    capture.events.done?.(
        "rec",
        blob,
        blob ? reason : reason === "stop" ? "leeg" : reason,
    );
}
