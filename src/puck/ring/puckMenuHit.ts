import { tracks } from "../../state/tracks";
import type { RingItem } from "../../types/RingItem";
import type { Track } from "../../types/Track";
import { tplRadiusMM } from "../tplRadiusMM";
import { view } from "../../state/view";
import { puckMenuOuterPX } from "./puckMenuOuterPX";
import { ringIndexOf } from "./ringIndexOf";
import { ringItems } from "./ringItems";

export function puckMenuHit(
    x: number,
    y: number,
): { track: Track; idx: number; item: RingItem } | null {
    const outer = puckMenuOuterPX();
    let best: Track | null = null;
    let bestDistance = Infinity;
    for (const t of tracks.map.values()) {
        if (t.state !== "recognised" || !t.ring) continue;
        const distance = Math.hypot(x - t.x, y - t.y);
        const radius = tplRadiusMM(t.tpl) * view.pxPerMM;
        if (
            distance < radius + 4 ||
            distance > outer ||
            distance >= bestDistance
        )
            continue;
        best = t;
        bestDistance = distance;
    }
    if (!best) return null;
    const items = ringItems(best);
    const idx = ringIndexOf(Math.atan2(y - best.y, x - best.x), items.length);
    return items[idx] ? { track: best, idx, item: items[idx] } : null;
}
