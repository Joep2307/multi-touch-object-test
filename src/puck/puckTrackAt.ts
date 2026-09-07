import { CFG } from "../config/CFG";
import { tracks } from "../state/tracks";
import { view } from "../state/view";
import type { Track } from "../types/Track";

/* The puck (not a candidate) whose disc, generously measured, lies under this point. */
export function puckTrackAt(x: number, y: number): Track | null {
    const R = CFG.puckRadiusMM * view.pxPerMM;
    let best: Track | null = null,
        bd = Infinity;
    for (const t of tracks.map.values()) {
        if (t.state === "candidate") continue;
        const d = Math.hypot(t.x - x, t.y - y);
        if (d < R * 1.3 && d < bd) {
            bd = d;
            best = t;
        }
    }
    return best;
}
