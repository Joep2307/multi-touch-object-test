import type { Track } from "../../types/Track";
import { dwellMSFor } from "./dwellMSFor";
import { ringItems } from "./ringItems";

/* How far the dwell has progressed; 0 if nothing is running. Only for display. */
export function puckDwellProgress(t: Track, now: number): number {
    if (t.dwellDone) return 0;
    const items = ringItems(t),
        item = items[t.dwellIdx];
    if (!item || item.disabled) return 0;
    return Math.max(0, Math.min(1, (now - t.dwellT0) / dwellMSFor(t)));
}
