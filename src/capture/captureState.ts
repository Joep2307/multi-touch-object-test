import { capture } from "../state";
import type { CaptureStatus } from "../types";

/* What the buttons show. `ms` is the clock of whatever is running — the
   button on the map shows it under the red dot, and it has to keep
   going during a time-lapse too. */
export function captureState(): CaptureStatus {
    const { rec, lapse, busy } = capture;
    return {
        rec: !!rec,
        lapse: !!lapse,
        busy,
        ms: rec
            ? Date.now() - capture.recStart
            : lapse
              ? Date.now() - lapse.start
              : 0,
        frames: lapse ? lapse.frames.length : 0,
    };
}
