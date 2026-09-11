import { capture } from "../state";
import {
    JPEG_Q,
    LAPSE_MAX_BYTES,
    LAPSE_MAX_FRAMES,
    LAPSE_MAX_W,
} from "./constants";
import { endLapse } from "./endLapse";
import { scaledCanvas } from "./scaledCanvas";

/* One more frame for the running time-lapse; the limits end it. */
export function grabFrame(): void {
    const cv = capture.cv;
    if (!capture.lapse || !cv) return;
    const off = scaledCanvas(cv, LAPSE_MAX_W);
    if (!off) return;
    try {
        off.toBlob(
            (b) => {
                const lapse = capture.lapse;
                if (!lapse || !b) return;
                lapse.frames.push(b);
                lapse.bytes += b.size;
                capture.events.change?.();
                if (
                    lapse.frames.length >= LAPSE_MAX_FRAMES ||
                    lapse.bytes >= LAPSE_MAX_BYTES
                )
                    void endLapse("limiet");
            },
            "image/jpeg",
            JPEG_Q,
        );
    } catch (err) {
        void endLapse("besmet"); // a tainted canvas
    }
}
