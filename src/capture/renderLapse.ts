import { capture } from "../state";
import { LAPSE_PLAY_FPS, REC_BITRATE } from "./constants";
import { pickMime } from "./pickMime";
import { wait } from "./wait";

/* Put the saved frames one after another on a canvas of their own and
   record that. They are only unpacked here: holding hundreds of
   separate images in memory at once is exactly what we must not do on
   the NUC. */
export async function renderLapse(frames: Blob[]): Promise<Blob> {
    const firstFrame = frames[0];
    if (!firstFrame) throw new Error("No frames to make a time-lapse of.");
    const first = await createImageBitmap(firstFrame);
    const out = document.createElement("canvas");
    out.width = first.width;
    out.height = first.height;
    const g = out.getContext("2d");
    if (!g) throw new Error("No drawing context for the time-lapse.");
    g.drawImage(first, 0, 0);
    first.close?.();

    const mime = pickMime();
    const stream = out.captureStream(LAPSE_PLAY_FPS);
    /* A canvas stream's video track is a CanvasCaptureMediaStreamTrack;
       the lib types the list as plain tracks. */
    const track = stream.getVideoTracks()[0] as
        CanvasCaptureMediaStreamTrack | undefined;
    const r = mime
        ? new MediaRecorder(stream, {
              mimeType: mime,
              videoBitsPerSecond: REC_BITRATE,
          })
        : new MediaRecorder(stream);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
    };
    const stopped = new Promise<void>((res) => {
        r.onstop = () => res();
    });
    r.start();

    const step = Math.round(1000 / LAPSE_PLAY_FPS);
    for (const f of frames) {
        const bmp = await createImageBitmap(f);
        g.drawImage(bmp, 0, 0, out.width, out.height);
        bmp.close?.();
        track?.requestFrame?.();
        await wait(step);
    }
    await wait(step * 4); // leave the last frame up for a moment
    try {
        r.stop();
    } catch (e) {}
    track?.stop?.();
    await stopped;
    capture.recMime = r.mimeType || mime || "video/webm";
    return new Blob(chunks, { type: capture.recMime });
}
