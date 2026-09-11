import { capture } from "../state";
import { SHOT_MAX_W } from "./constants";
import { scaledCanvas } from "./scaledCanvas";

/* One still of the canvas, as PNG. Rejects when there is no canvas or
   nothing on it yet — and when the canvas is tainted, which `toBlob`
   reports by throwing. */
export function captureShot(): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const cv = capture.cv;
        if (!cv) {
            reject(new Error("no canvas"));
            return;
        }
        const off = scaledCanvas(cv, SHOT_MAX_W);
        if (!off) {
            reject(new Error("empty"));
            return;
        }
        try {
            off.toBlob(
                (b) => (b ? resolve(b) : reject(new Error("empty"))),
                "image/png",
            );
        } catch (err) {
            reject(err); // a tainted canvas throws here
        }
    });
}
