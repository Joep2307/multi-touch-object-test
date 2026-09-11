import { tracks } from "../state";
import { puckSepPX } from "./puckSepPX";
import type { SimPuck, Track } from "../types";

/* A drag copy belongs to the track that lies closest to it and has the same
   kind; with two pucks of one kind, the template alone no longer says which.
   */
export function trackForSim(s: SimPuck): Track | null {
    let best: Track | null = null,
        bd = puckSepPX();
    for (const t of tracks.map.values()) {
        if (t.tpl.id !== s.tpl.id) continue;
        const d = Math.hypot(t.x - s.x, t.y - s.y);
        if (d < bd) {
            bd = d;
            best = t;
        }
    }
    return best;
}
