import type { Lang } from "../types/Lang";
import type { TalkSay } from "../types/TalkSay";
import type { TalkSession } from "../types/TalkSession";
import { CHUNK_MS } from "./CHUNK_MS";
import { MIN_BYTES } from "./MIN_BYTES";
import { stt } from "./stt";

/* Record and send. One MediaRecorder per chunk instead of one long one with
   `timeslice`: a fragment from the middle of a webm stream can't be played
   on its own and therefore can't be transcribed either. Each round is
   therefore a complete little file. */
export async function recorderSession(
    lang: Lang,
    say: TalkSay,
    toBackend: boolean,
): Promise<TalkSession | null> {
    let stream: MediaStream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        });
    } catch (e) {
        const err = e as { name?: string } | null;
        say.error(
            err &&
                (err.name === "NotAllowedError" ||
                    err.name === "SecurityError")
                ? "denied"
                : "nomic",
        );
        return null;
    }
    const mime =
        [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4",
            "audio/ogg;codecs=opus",
        ].find((t) => {
            try {
                return MediaRecorder.isTypeSupported(t);
            } catch (e) {
                return false;
            }
        }) || "";

    let live = true,
        rec: MediaRecorder | null = null,
        timer: ReturnType<typeof setTimeout> | null = null,
        chunks: Blob[] = [];
    const kept: Blob[] = []; // only in recording mode: keep everything
    let queue: Promise<void> = Promise.resolve(); // transcribe in order
    let toldBackendBroke = false;
    /* The last chunk is only sent once the recorder has actually stopped, so
     after the stop button is pressed. Anyone who wants to know what the
     final result is must wait for this signal first and only then for the
     queue — not the other way around. */
    let recorderDone!: () => void;
    const stopped = new Promise<void>((r) => {
        recorderDone = r;
    });

    const send = (blob: Blob) => {
        if (blob.size < MIN_BYTES) return;
        queue = queue.then(async () => {
            const fd = new FormData();
            fd.append(
                "audio",
                blob,
                "deel." + (blob.type.includes("mp4") ? "m4a" : "webm"),
            );
            fd.append("lang", lang);
            try {
                const r = await fetch(stt.url, { method: "POST", body: fd });
                if (!r.ok) throw new Error("HTTP " + r.status);
                const j = await r.json();
                const text = String(j.text || "").trim();
                if (text) say.segment(text);
            } catch (e) {
                /* One notification, not one per chunk: if the service drops
           out, the recording keeps running and whoever is present can
           decide to stop it. */
                if (!toldBackendBroke) {
                    toldBackendBroke = true;
                    say.error("backend");
                }
            }
        });
    };

    const closeMic = () => {
        stream.getTracks().forEach((t) => {
            try {
                t.stop();
            } catch (e) {}
        });
    };

    const finish = () => {
        closeMic();
        if (!toBackend && kept.length)
            say.audio(new Blob(kept, { type: kept[0]?.type || "audio/webm" }));
        recorderDone();
    };

    const startPiece = () => {
        chunks = [];
        try {
            rec = new MediaRecorder(
                stream,
                mime ? { mimeType: mime } : undefined,
            );
        } catch (e) {
            live = false;
            say.error("nomic");
            closeMic();
            return;
        }
        const r = rec;
        r.ondataavailable = (e) => {
            if (e.data && e.data.size) chunks.push(e.data);
        };
        r.onstop = () => {
            const blob = new Blob(chunks, {
                type: r.mimeType || mime || "audio/webm",
            });
            if (toBackend) send(blob);
            else kept.push(blob);
            if (live) startPiece();
            else finish();
        };
        r.start();
        /* Only transcription mode cuts into chunks; without a service, one
       long recording is exactly what you want to keep. */
        if (toBackend)
            timer = setTimeout(() => {
                if (rec && rec.state === "recording") rec.stop();
            }, CHUNK_MS);
    };

    startPiece();
    return {
        mode: toBackend ? "backend" : "audio",
        stop() {
            live = false;
            if (timer) clearTimeout(timer);
            timer = null;
            say.partial("");
            if (rec && rec.state === "recording")
                rec.stop(); // onstop finishes it off
            else finish();
            // Let the recorder finish first, only then the queue: the last
            // bit of speech is only sent on its way after that stop.
            return stopped.then(() => queue);
        },
    };
}
