import { capture } from "../state";
import { finishRec } from "./finishRec";

/* When a session is wiped or reset, nothing may keep running. */
export function cancelCapture(): void {
    if (capture.rec) finishRec("stop");
    const lapse = capture.lapse;
    if (lapse) {
        clearInterval(lapse.timer);
        clearInterval(lapse.tick);
        capture.lapse = null;
        capture.events.change?.();
    }
}
