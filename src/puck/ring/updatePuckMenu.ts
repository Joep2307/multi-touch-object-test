import type { Track } from "../../types/Track";
import { commitPuckChoice } from "./commitPuckChoice";
import { dwellMSFor } from "./dwellMSFor";
import { ringIndexOf } from "./ringIndexOf";
import { ringItems } from "./ringItems";

/* Track the dwell. Called every frame for as long as a puck lies on the table. */
export function updatePuckMenu(t: Track, now: number): void {
    const n = ringItems(t).length,
        idx = ringIndexOf(t.angle, n);
    if (idx !== t.dwellIdx) {
        t.dwellIdx = idx;
        t.dwellT0 = now;
        t.dwellDone = false;
        return;
    }
    if (t.dwellDone) return;
    if (now - t.dwellT0 >= dwellMSFor(t)) {
        t.dwellDone = true;
        commitPuckChoice(t, idx);
    }
}
