import { SCALE } from "../../config/SCALE";
import { scale } from "../../state/scale";
import type { ScaleReading } from "../../types/ScaleReading";
import { saveScale } from "./saveScale";
import { syncPxPerMM } from "./syncPxPerMM";

/* Fold one reading into what the table believes about its screen.

   The clamp is anchored to the seed and never to the last answer. An
   estimator anchored to its own previous value can be walked anywhere by a
   long enough run of bad frames; anchored to the seed it can only ever
   correct it, by at most `maxDrift`.

   Deliberately not gated on anything computed from `view.pxPerMM`. The
   size check inside recognition is, which is why `conf` here is the shape
   agreement the caller passes and not the confidence that includes size: a
   calibrator may not be gated by the thing it calibrates. */
export function observeScale(reading: ScaleReading): void {
    if (reading.conf < SCALE.minConf) return;
    if (scale.seed <= 0) return;
    const measured = reading.px / reading.mm;
    if (!Number.isFinite(measured) || measured <= 0) return;
    const w = SCALE.smoothing,
        lo = 1 - SCALE.maxDrift,
        hi = 1 + SCALE.maxDrift;
    const blended = scale.k * (1 - w) + (measured / scale.seed) * w;
    scale.k = Math.min(hi, Math.max(lo, blended));
    scale.samples += 1;
    syncPxPerMM();
    saveScale();
}
