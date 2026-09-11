import { capture } from "../state/capture";
import { REC_BITRATE, REC_FPS, REC_MAX_BYTES, REC_MAX_MS } from "./constants";
import { endRec } from "./endRec";
import { finishRec } from "./finishRec";
import { pickMime } from "./pickMime";

/* Start filming the canvas. A browser that cannot is reported as
   "onbruikbaar"; the size and time limits end the film by themselves. */
export function beginRec(): void {
    const cv = capture.cv;
    if (!cv || capture.rec || capture.busy) return;
    const mime = pickMime();
    let r: MediaRecorder;
    try {
        const stream = cv.captureStream(REC_FPS);
        r = mime
            ? new MediaRecorder(stream, {
                  mimeType: mime,
                  videoBitsPerSecond: REC_BITRATE,
              })
            : new MediaRecorder(stream);
    } catch (err) {
        capture.events.done?.("rec", null, "onbruikbaar");
        return;
    }

    capture.recChunks = [];
    capture.recBytes = 0;
    capture.recStart = Date.now();
    capture.recReason = "stop";
    capture.recMime = r.mimeType || mime || "video/webm";

    r.ondataavailable = (e) => {
        if (!e.data || !e.data.size) return;
        capture.recChunks.push(e.data);
        capture.recBytes += e.data.size;
        if (capture.recBytes > REC_MAX_BYTES) finishRec("limiet");
    };
    // A tainted canvas stumbles here, not at the start.
    r.onerror = () => {
        capture.recReason = "besmet";
        try {
            r.stop();
        } catch (e) {
            endRec();
        }
    };
    r.onstop = endRec;

    try {
        r.start(1000);
    } catch (err) {
        capture.events.done?.("rec", null, "onbruikbaar");
        return;
    }

    capture.rec = r;
    capture.recTimer = setInterval(() => {
        capture.events.change?.();
        if (Date.now() - capture.recStart > REC_MAX_MS) finishRec("limiet");
    }, 1000);
    capture.events.change?.();
}
