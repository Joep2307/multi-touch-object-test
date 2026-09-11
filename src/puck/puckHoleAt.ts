import { CFG, PUCK_HOLE } from "../config";
import { tracks, view } from "../state";
import type { Track } from "../types";

/* The puck whose viewing hole lies under this point. Deliberately tight:
   only the hole counts, not the whole disc. */
export function puckHoleAt(x: number, y: number): Track | null {
    const hole = CFG.puckRadiusMM * view.pxPerMM * PUCK_HOLE;
    let best: Track | null = null,
        bd = Infinity;
    for (const t of tracks.map.values()) {
        if (t.state !== "recognised") continue;
        const d = Math.hypot(t.x - x, t.y - y);
        if (d < hole && d < bd) {
            bd = d;
            best = t;
        }
    }
    return best;
}
