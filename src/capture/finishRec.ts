import { capture } from "../state/capture";
import type { CapReason } from "../types/CapReason";
import { endRec } from "./endRec";

/* Ask the recorder to stop; `endRec` follows from its `onstop`, or
   straight away if stopping itself fails. */
export function finishRec(reason: CapReason): void {
    const r = capture.rec;
    if (!r) return;
    capture.recReason = reason;
    try {
        r.stop();
    } catch (err) {
        endRec();
    }
}
