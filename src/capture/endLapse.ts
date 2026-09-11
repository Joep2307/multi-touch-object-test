import { capture } from "../state";
import { renderLapse } from "./renderLapse";
import type { CapReason } from "../types";

/* Stop collecting frames and, if there are enough, make the film. Fewer
   than two frames is "leeg"; a tainted canvas has no film in it at
   all. */
export async function endLapse(reason: CapReason): Promise<void> {
    const lapse = capture.lapse;
    if (!lapse) return;
    clearInterval(lapse.timer);
    clearInterval(lapse.tick);
    const frames = lapse.frames;
    capture.lapse = null;

    if (reason === "besmet" || frames.length < 2) {
        capture.events.change?.();
        capture.events.done?.(
            "lapse",
            null,
            reason === "besmet" ? "besmet" : "leeg",
        );
        return;
    }
    capture.busy = true;
    capture.events.change?.();
    let blob: Blob | null = null;
    let why: CapReason = reason;
    try {
        blob = await renderLapse(frames);
    } catch (err) {
        why = "fout";
    }
    capture.busy = false;
    capture.events.change?.();
    capture.events.done?.("lapse", blob, blob ? why : "fout");
}
