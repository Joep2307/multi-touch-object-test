import { capture } from "../state";
import { LAPSE_EVERY_MS } from "./constants";
import { grabFrame } from "./grabFrame";
import type { Lapse } from "../types";

/* Start a time-lapse: a first frame straight away, then one every few
   seconds. */
export function beginLapse(): void {
    if (!capture.cv || capture.lapse || capture.busy) return;
    const lapse: Lapse = {
        timer: 0,
        tick: 0,
        frames: [],
        bytes: 0,
        start: Date.now(),
    };
    capture.lapse = lapse;
    grabFrame();
    lapse.timer = setInterval(grabFrame, LAPSE_EVERY_MS);
    // A frame only arrives every few seconds; the clock has to move every
    // second, or it sits there jumping on the button.
    lapse.tick = setInterval(() => capture.events.change?.(), 1000);
    capture.events.change?.();
}
