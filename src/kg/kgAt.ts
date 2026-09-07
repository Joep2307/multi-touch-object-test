import { MV } from "../map/MV";
import type { KgNode } from "../types/KgNode";
import { kg } from "./kg";

/* Topmost node under a tap. A wider radius than the dot itself, because
   this is being pointed at with a finger on a 43" screen. */
export function kgAt(x: number, y: number): KgNode | null {
    if (!kg.enabled) return null;
    let best: KgNode | null = null,
        bestD = 18;
    for (const n of kg.nodes) {
        const s = MV.project(n.lon, n.lat);
        const d = Math.hypot(s.x - x, s.y - y);
        if (d < bestD) {
            best = n;
            bestD = d;
        }
    }
    return best;
}
